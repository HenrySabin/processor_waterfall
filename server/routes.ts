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

  const httpServer = createServer(app);
  return httpServer;
}
