import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { paymentProcessor } from "./services/paymentProcessor";
import { circuitBreaker } from "./services/circuitBreaker";
import { algorandClient } from "./services/algorandClient";
import { logger } from "./utils/logger";
import { paymentRequestSchema } from "@shared/schema";
import { apiRateLimiter, paymentRateLimiter, healthCheckRateLimiter } from "./middleware/rateLimiter";
import helmet from "helmet";
import cors from "cors";

export async function registerRoutes(app: Express): Promise<Server> {
  // Security and CORS middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || false
      : true,
    credentials: true,
  }));

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimiter.middleware);

  // Health check endpoint (no auth required)
  app.get('/api/health', healthCheckRateLimiter.middleware, async (req, res) => {
    try {
      const systemStats = await storage.getSystemStats();
      const processorStatus = await paymentProcessor.getProcessorStatus();
      const circuitBreakerStatus = await circuitBreaker.getCircuitBreakerStatus();
      const contractStatus = await algorandClient.getContractStatus();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        system: {
          api: 'healthy',
          database: 'connected',
          uptime: process.uptime(),
        },
        metrics: systemStats,
        processors: processorStatus.map(p => ({
          name: p.name,
          enabled: p.enabled,
          circuitBreakerOpen: p.circuitBreakerOpen,
          successRate: p.successRate,
          avgResponseTime: p.avgResponseTime,
        })),
        circuitBreakers: circuitBreakerStatus,
        smartContract: contractStatus,
      };

      logger.info('Health check requested', 'api', { ip: req.ip });
      res.json(health);
    } catch (error) {
      logger.error('Health check failed', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Payment processing endpoint
  app.post('/api/payments', paymentRateLimiter.middleware, async (req, res) => {
    try {
      // Validate request body
      const validatedData = paymentRequestSchema.parse(req.body);
      
      logger.info(
        `Payment processing requested: ${validatedData.amount} ${validatedData.currency}`,
        'api',
        { ip: req.ip, amount: validatedData.amount, currency: validatedData.currency }
      );

      // Process payment through waterfall
      const result = await paymentProcessor.processPayment(validatedData);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          transactionId: result.transaction.id,
          amount: result.transaction.amount,
          currency: result.transaction.currency,
          status: result.transaction.status,
          processorUsed: result.processorUsed,
          processingTime: result.totalProcessingTime,
          createdAt: result.transaction.createdAt,
        });
      } else {
        res.status(402).json({
          success: false,
          transactionId: result.transaction.id,
          error: 'Payment processing failed',
          details: result.transaction.failureReason,
          attemptedProcessors: result.attemptedProcessors,
          processingTime: result.totalProcessingTime,
        });
      }
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        // Zod validation error
        logger.warn('Payment request validation failed', 'api', { error: error.message, ip: req.ip });
        res.status(400).json({
          success: false,
          error: 'Invalid payment request',
          details: error.message,
        });
      } else {
        logger.error('Payment processing error', 'api', error instanceof Error ? error : undefined);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  });

  // Get payment status
  app.get('/api/payments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        res.status(404).json({
          error: 'Transaction not found',
        });
        return;
      }

      res.json({
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        processorId: transaction.processorId,
        processorTransactionId: transaction.processorTransactionId,
        failureReason: transaction.failureReason,
        processingTime: transaction.processingTime,
        attemptedProcessors: transaction.attemptedProcessors,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      });
    } catch (error) {
      logger.error('Error retrieving transaction', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve transaction',
      });
    }
  });

  // Get processors status
  app.get('/api/processors', async (req, res) => {
    try {
      const processorStatus = await paymentProcessor.getProcessorStatus();
      res.json({
        processors: processorStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving processors status', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve processors status',
      });
    }
  });

  // Toggle processor enabled/disabled
  app.post('/api/processors/:id/toggle', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await paymentProcessor.toggleProcessor(id);
      
      if (!success) {
        res.status(404).json({
          error: 'Processor not found',
        });
        return;
      }

      const updatedProcessor = await storage.getProcessor(id);
      logger.info(
        `Processor ${updatedProcessor?.name} toggled`,
        'api',
        { processorId: id, enabled: updatedProcessor?.enabled, ip: req.ip }
      );

      res.json({
        success: true,
        processorId: id,
        enabled: updatedProcessor?.enabled,
        message: `Processor ${updatedProcessor?.enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      logger.error('Error toggling processor', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to toggle processor',
      });
    }
  });

  // Get recent transactions
  app.get('/api/transactions', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      
      const transactions = await storage.getTransactions(limit, offset);
      
      res.json({
        transactions: transactions.map(t => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          processorId: t.processorId,
          processingTime: t.processingTime,
          createdAt: t.createdAt,
          failureReason: t.failureReason,
        })),
        pagination: {
          limit,
          offset,
          total: transactions.length,
        },
      });
    } catch (error) {
      logger.error('Error retrieving transactions', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve transactions',
      });
    }
  });

  // Run comprehensive health checks
  app.post('/api/health-check', healthCheckRateLimiter.middleware, async (req, res) => {
    try {
      logger.info('Comprehensive health check initiated', 'api', { ip: req.ip });
      
      const healthResults = await paymentProcessor.runHealthChecks();
      const systemStats = await storage.getSystemStats();
      const processorStatus = await paymentProcessor.getProcessorStatus();
      
      res.json({
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        healthChecks: healthResults,
        systemStats,
        processors: processorStatus,
      });
    } catch (error) {
      logger.error('Comprehensive health check failed', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get system metrics
  app.get('/api/metrics', async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      const recentTransactions = await storage.getRecentTransactions(5);
      const processorStatus = await paymentProcessor.getProcessorStatus();
      
      res.json({
        stats,
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          processorId: t.processorId,
          createdAt: t.createdAt,
          processingTime: t.processingTime,
        })),
        processors: processorStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving metrics', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve metrics',
      });
    }
  });

  // Smart contract endpoints
  app.get('/api/smart-contract/status', async (req, res) => {
    try {
      const status = await algorandClient.getContractStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error retrieving smart contract status', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve smart contract status',
      });
    }
  });

  app.get('/api/smart-contract/priorities', async (req, res) => {
    try {
      const priorities = await algorandClient.getProcessorPriorities();
      res.json({ priorities });
    } catch (error) {
      logger.error('Error retrieving processor priorities', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve processor priorities',
      });
    }
  });

  // System logs endpoint
  app.get('/api/logs', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const level = req.query.level as string;
      
      const logs = await storage.getSystemLogs(limit, level);
      
      res.json({
        logs: logs.map(log => ({
          id: log.id,
          level: log.level,
          message: log.message,
          service: log.service,
          timestamp: log.timestamp,
          transactionId: log.transactionId,
          processorId: log.processorId,
        })),
        pagination: {
          limit,
          level: level || 'all',
        },
      });
    } catch (error) {
      logger.error('Error retrieving logs', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to retrieve logs',
      });
    }
  });

  // Demo simulation endpoint for payment demonstrations
  app.post('/api/demo/simulate-load', async (req, res) => {
    try {
      logger.info('Demo payment load simulation started', 'api', { ip: req.ip });
      
      const demoPayments = [
        // Initial successful burst
        { amount: "25.99", currency: "USD", metadata: { demo: true, customer: "Alice Johnson", product: "Premium Plan" } },
        { amount: "149.99", currency: "USD", metadata: { demo: true, customer: "Bob Smith", product: "Enterprise License" } },
        { amount: "89.50", currency: "USD", metadata: { demo: true, customer: "Carol Davis", product: "Monthly Subscription" } },
        { amount: "12.00", currency: "USD", metadata: { demo: true, customer: "David Wilson", product: "Basic Plan" } },
        { amount: "299.99", currency: "USD", metadata: { demo: true, customer: "Eva Brown", product: "Yearly Premium" } },
        
        // More realistic transactions
        { amount: "67.49", currency: "USD", metadata: { demo: true, customer: "Frank Miller", product: "Pro Tools" } },
        { amount: "34.99", currency: "USD", metadata: { demo: true, customer: "Grace Lee", product: "Monthly Pro" } },
        { amount: "156.00", currency: "USD", metadata: { demo: true, customer: "Henry Chang", product: "Team License" } },
        { amount: "78.25", currency: "USD", metadata: { demo: true, customer: "Ivy Martinez", product: "Standard Plan" } },
        { amount: "199.99", currency: "USD", metadata: { demo: true, customer: "Jack Thompson", product: "Annual Pro" } },
        
        // High-value transactions
        { amount: "499.99", currency: "USD", metadata: { demo: true, customer: "Kelly Anderson", product: "Enterprise Suite" } },
        { amount: "999.00", currency: "USD", metadata: { demo: true, customer: "Liam Rodriguez", product: "Corporate License" } },
        { amount: "45.99", currency: "USD", metadata: { demo: true, customer: "Maya Patel", product: "Starter Pack" } },
        { amount: "125.50", currency: "USD", metadata: { demo: true, customer: "Nathan Kim", product: "Developer Tools" } },
        { amount: "379.99", currency: "USD", metadata: { demo: true, customer: "Olivia Green", product: "Team Premium" } },
        
        // More diverse amounts
        { amount: "22.49", currency: "USD", metadata: { demo: true, customer: "Paul Walker", product: "Basic Tools" } },
        { amount: "188.75", currency: "USD", metadata: { demo: true, customer: "Quinn Taylor", product: "Pro Suite" } },
        { amount: "56.99", currency: "USD", metadata: { demo: true, customer: "Rachel White", product: "Monthly Basic" } },
        { amount: "245.00", currency: "USD", metadata: { demo: true, customer: "Sam Johnson", product: "Quarterly Pro" } },
        { amount: "99.99", currency: "USD", metadata: { demo: true, customer: "Tina Liu", product: "Standard Pro" } },
        
        // Final burst
        { amount: "167.49", currency: "USD", metadata: { demo: true, customer: "Uma Shah", product: "Team Standard" } },
        { amount: "89.99", currency: "USD", metadata: { demo: true, customer: "Victor Chen", product: "Monthly Plus" } },
        { amount: "299.49", currency: "USD", metadata: { demo: true, customer: "Wendy Brooks", product: "Annual Team" } },
        { amount: "139.99", currency: "USD", metadata: { demo: true, customer: "Xavier Jones", product: "Pro Monthly" } },
        { amount: "459.99", currency: "USD", metadata: { demo: true, customer: "Yuki Tanaka", product: "Enterprise Pro" } }
      ];

      // Process payments with realistic timing
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < demoPayments.length; i++) {
        const payment = demoPayments[i];
        
        try {
          const result = await paymentProcessor.processPayment(payment);
          results.push({
            paymentIndex: i + 1,
            amount: payment.amount,
            success: result.success,
            processorUsed: result.processorUsed,
            transactionId: result.transaction.id,
            processingTime: result.totalProcessingTime
          });
          
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
          
          // Add small delay between payments to simulate realistic load
          if (i < demoPayments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
          }
        } catch (error) {
          failureCount++;
          results.push({
            paymentIndex: i + 1,
            amount: payment.amount,
            success: false,
            error: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }

      logger.info(
        `Demo simulation completed: ${successCount} successful, ${failureCount} failed`,
        'api',
        { 
          totalPayments: demoPayments.length,
          successCount,
          failureCount,
          ip: req.ip 
        }
      );

      res.json({
        success: true,
        message: 'Payment load simulation completed',
        summary: {
          totalPayments: demoPayments.length,
          successfulPayments: successCount,
          failedPayments: failureCount,
          successRate: Math.round((successCount / demoPayments.length) * 100)
        },
        results: results.slice(0, 10) // Return first 10 results for reference
      });

    } catch (error) {
      logger.error('Demo simulation error', 'api', error instanceof Error ? error : undefined);
      res.status(500).json({
        success: false,
        error: 'Demo simulation failed',
        message: 'Failed to run payment load simulation'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
