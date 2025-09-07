import { logger } from "../utils/logger";

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  processingTime: number;
  errorMessage?: string;
  errorCode?: string;
}

export class SquareAdapter {
  private appId: string;
  private baseSuccessRate: number;

  constructor(appId: string, successRate = 95.1) {
    this.appId = appId;
    this.baseSuccessRate = successRate;
  }

  async processPayment(amount: string, currency: string, metadata: Record<string, any> = {}): Promise<PaymentResult> {
    const startTime = Date.now();
    
    try {
      // Simulate API delay
      const delay = this.getRandomDelay(120, 250);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simulate success/failure based on configured rate
      const success = Math.random() * 100 < this.baseSuccessRate;
      const processingTime = Date.now() - startTime;
      
      if (success) {
        const transactionId = `square_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.debug(
          `Square payment processed successfully: ${amount} ${currency}`,
          'square-adapter',
          { transactionId, processingTime, metadata }
        );
        
        return {
          success: true,
          transactionId,
          processingTime,
        };
      } else {
        const errorMessages = [
          'Card processing error',
          'Square service timeout',
          'Invalid merchant configuration',
          'Transaction declined',
          'Card verification failed',
        ];
        const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        const errorCode = `square_error_${Math.floor(Math.random() * 1000)}`;
        
        logger.warn(
          `Square payment failed: ${errorMessage}`,
          'square-adapter',
          { amount, currency, errorCode, processingTime, metadata }
        );
        
        return {
          success: false,
          processingTime,
          errorMessage,
          errorCode,
        };
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(
        `Square adapter error: ${errorMessage}`,
        'square-adapter',
        error instanceof Error ? error : undefined,
        { amount, currency, processingTime, metadata }
      );
      
      return {
        success: false,
        processingTime,
        errorMessage: 'Payment processor error',
        errorCode: 'square_system_error',
      };
    }
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Simulate health check API call
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(60, 120)));
      
      const responseTime = Date.now() - startTime;
      const healthy = Math.random() > 0.12; // 88% health check success rate (lowest of the three)
      
      return {
        healthy,
        responseTime,
        error: healthy ? undefined : 'Square API health check failed',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Health check error',
      };
    }
  }
}
