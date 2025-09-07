import { storage } from "../storage";
import { logger, LogLevel } from "../utils/logger";
import { circuitBreaker } from "./circuitBreaker";
import { algorandClient } from "./algorandClient";
import { StripeAdapter } from "../adapters/stripeAdapter";
import { PayPalAdapter } from "../adapters/paypalAdapter";
import { SquareAdapter } from "../adapters/squareAdapter";
import type { PaymentRequest, Transaction } from "@shared/schema";

export interface PaymentProcessorResult {
  success: boolean;
  transaction: Transaction;
  processorUsed?: string;
  attemptedProcessors: string[];
  totalProcessingTime: number;
}

export class PaymentProcessor {
  private adapters: Map<string, any>;

  constructor() {
    this.adapters = new Map();
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    // Initialize payment processor adapters
    this.adapters.set('stripe', new StripeAdapter(
      process.env.STRIPE_API_KEY || 'mock_stripe_key'
    ));
    
    this.adapters.set('paypal', new PayPalAdapter(
      process.env.PAYPAL_CLIENT_ID || 'mock_paypal_client_id'
    ));
    
    this.adapters.set('square', new SquareAdapter(
      process.env.SQUARE_APP_ID || 'mock_square_app_id'
    ));
  }

  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentProcessorResult> {
    const startTime = Date.now();
    const attemptedProcessors: string[] = [];
    
    // Create initial transaction record
    const transaction = await storage.createTransaction({
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      status: 'pending',
      processorId: null,
      failureReason: null,
      attemptedProcessors,
      metadata: paymentRequest.metadata,
    });

    logger.transactionLog(
      'info',
      `Starting payment processing for amount ${paymentRequest.amount} ${paymentRequest.currency}`,
      transaction.id
    );

    try {
      // Get available processors in priority order
      const processors = await this.getAvailableProcessors();
      
      if (processors.length === 0) {
        const errorMessage = 'No payment processors available';
        await this.updateTransactionFailure(transaction.id, errorMessage, attemptedProcessors, startTime);
        
        logger.transactionLog(
          'error',
          errorMessage,
          transaction.id
        );
        
        return {
          success: false,
          transaction: (await storage.getTransaction(transaction.id))!,
          attemptedProcessors,
          totalProcessingTime: Date.now() - startTime,
        };
      }

      // Try each processor in waterfall order
      for (const processor of processors) {
        const processorStartTime = Date.now();
        attemptedProcessors.push(processor.name);
        
        // Check circuit breaker
        const isAvailable = await circuitBreaker.checkProcessor(processor.id);
        if (!isAvailable) {
          logger.transactionLog(
            'warn',
            `Processor ${processor.name} unavailable (circuit breaker open)`,
            transaction.id,
            processor.id
          );
          continue;
        }

        try {
          // Get the appropriate adapter
          const adapter = this.adapters.get(processor.type);
          if (!adapter) {
            logger.transactionLog(
              'error',
              `No adapter found for processor type ${processor.type}`,
              transaction.id,
              processor.id
            );
            continue;
          }

          // Process payment
          logger.transactionLog(
            'info',
            `Attempting payment with ${processor.name}`,
            transaction.id,
            processor.id
          );

          const result = await adapter.processPayment(
            paymentRequest.amount,
            paymentRequest.currency,
            paymentRequest.metadata
          );

          if (result.success) {
            // Payment successful
            await circuitBreaker.recordSuccess(processor.id);
            
            const updatedTransaction = await storage.updateTransaction(transaction.id, {
              status: 'success',
              processorId: processor.id,
              processorTransactionId: result.transactionId,
              processingTime: Date.now() - startTime,
              attemptedProcessors,
            });

            // Record health metrics
            await this.recordHealthMetrics(processor.id, true, result.processingTime);

            logger.transactionLog(
              'info',
              `Payment successful with ${processor.name}`,
              transaction.id,
              processor.id,
              { 
                processorTransactionId: result.transactionId,
                processingTime: result.processingTime,
              }
            );

            return {
              success: true,
              transaction: updatedTransaction!,
              processorUsed: processor.name,
              attemptedProcessors,
              totalProcessingTime: Date.now() - startTime,
            };
          } else {
            // Payment failed with this processor
            await circuitBreaker.recordFailure(processor.id);
            await this.recordHealthMetrics(processor.id, false, result.processingTime);

            logger.transactionLog(
              'warn',
              `Payment failed with ${processor.name}: ${result.errorMessage}`,
              transaction.id,
              processor.id,
              {
                errorCode: result.errorCode,
                processingTime: result.processingTime,
              }
            );
          }
        } catch (error) {
          // Adapter error
          const processingTime = Date.now() - processorStartTime;
          await circuitBreaker.recordFailure(processor.id);
          await this.recordHealthMetrics(processor.id, false, processingTime);

          logger.transactionLog(
            'error',
            `Processor ${processor.name} threw an error`,
            transaction.id,
            processor.id,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          );
        }
      }

      // All processors failed
      const errorMessage = 'All payment processors failed';
      await this.updateTransactionFailure(transaction.id, errorMessage, attemptedProcessors, startTime);

      logger.transactionLog(
        'error',
        errorMessage,
        transaction.id,
        undefined,
        { attemptedProcessors }
      );

      return {
        success: false,
        transaction: (await storage.getTransaction(transaction.id))!,
        attemptedProcessors,
        totalProcessingTime: Date.now() - startTime,
      };

    } catch (error) {
      // System error
      const errorMessage = `Payment processing system error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await this.updateTransactionFailure(transaction.id, errorMessage, attemptedProcessors, startTime);

      logger.transactionLog(
        'error',
        errorMessage,
        transaction.id
      );

      return {
        success: false,
        transaction: (await storage.getTransaction(transaction.id))!,
        attemptedProcessors,
        totalProcessingTime: Date.now() - startTime,
      };
    }
  }

  private async getAvailableProcessors() {
    // Get processors from storage and filter by availability
    const allProcessors = await storage.getAllProcessors();
    const activeProcessors = allProcessors.filter(p => p.enabled);

    // Sort by priority
    return activeProcessors.sort((a, b) => a.priority - b.priority);
  }

  private async updateTransactionFailure(
    transactionId: string, 
    errorMessage: string, 
    attemptedProcessors: string[], 
    startTime: number
  ): Promise<void> {
    await storage.updateTransaction(transactionId, {
      status: 'failed',
      failureReason: errorMessage,
      processingTime: Date.now() - startTime,
      attemptedProcessors,
    });
  }

  private async recordHealthMetrics(
    processorId: string, 
    success: boolean, 
    responseTime: number
  ): Promise<void> {
    try {
      await storage.createHealthMetric({
        processorId,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        avgResponseTime: responseTime.toString(),
        totalTransactions: 1,
      });
    } catch (error) {
      logger.error(
        'Failed to record health metrics',
        'payment-processor',
        error instanceof Error ? error : undefined,
        { processorId, success, responseTime }
      );
    }
  }

  async getProcessorStatus(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    circuitBreakerOpen: boolean;
    priority: number;
    successRate: string;
    avgResponseTime: number;
    consecutiveFailures: number;
    lastFailureTime: Date | null;
  }>> {
    const processors = await storage.getAllProcessors();
    const healthMetrics = await storage.getLatestHealthMetrics();
    
    return processors.map(processor => {
      const metrics = healthMetrics.find(m => m.processorId === processor.id);
      const avgResponseTime = metrics ? parseFloat(metrics.avgResponseTime) : 0;
      
      return {
        id: processor.id,
        name: processor.name,
        type: processor.type,
        enabled: processor.enabled,
        circuitBreakerOpen: processor.circuitBreakerOpen,
        priority: processor.priority,
        successRate: processor.successRate,
        avgResponseTime,
        consecutiveFailures: processor.consecutiveFailures,
        lastFailureTime: processor.lastFailureTime,
      };
    });
  }

  async toggleProcessor(processorId: string): Promise<boolean> {
    const processor = await storage.getProcessor(processorId);
    if (!processor) {
      return false;
    }

    const newEnabledState = !processor.enabled;
    await storage.updateProcessor(processorId, { enabled: newEnabledState });

    logger.info(
      `Processor ${processor.name} ${newEnabledState ? 'enabled' : 'disabled'}`,
      'payment-processor',
      { processorId, enabled: newEnabledState }
    );

    return true;
  }

  async runHealthChecks(): Promise<Record<string, any>> {
    const processors = await storage.getAllProcessors();
    const results: Record<string, any> = {};

    for (const processor of processors) {
      const adapter = this.adapters.get(processor.type);
      if (adapter && typeof adapter.healthCheck === 'function') {
        try {
          const health = await adapter.healthCheck();
          results[processor.name] = health;
          
          logger.debug(
            `Health check completed for ${processor.name}`,
            'payment-processor',
            { processorId: processor.id, health }
          );
        } catch (error) {
          results[processor.name] = {
            healthy: false,
            error: error instanceof Error ? error.message : 'Health check failed',
          };
          
          logger.warn(
            `Health check failed for ${processor.name}`,
            'payment-processor',
            { processorId: processor.id, error: error instanceof Error ? error.message : 'Unknown error' }
          );
        }
      }
    }

    // Check Algorand smart contract status
    try {
      const contractStatus = await algorandClient.getContractStatus();
      results['algorand'] = contractStatus;
    } catch (error) {
      results['algorand'] = {
        connected: false,
        error: error instanceof Error ? error.message : 'Smart contract check failed',
      };
    }

    return results;
  }
}

export const paymentProcessor = new PaymentProcessor();
