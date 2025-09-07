import { 
  type Processor, 
  type Transaction, 
  type HealthMetric, 
  type SystemLog,
  type InsertProcessor, 
  type InsertTransaction, 
  type InsertHealthMetric, 
  type InsertSystemLog 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Processor operations
  getProcessor(id: string): Promise<Processor | undefined>;
  getProcessorByName(name: string): Promise<Processor | undefined>;
  getAllProcessors(): Promise<Processor[]>;
  getActiveProcessors(): Promise<Processor[]>;
  createProcessor(processor: InsertProcessor): Promise<Processor>;
  updateProcessor(id: string, updates: Partial<Processor>): Promise<Processor | undefined>;
  deleteProcessor(id: string): Promise<boolean>;
  
  // Transaction operations
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
  getRecentTransactions(limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Health metrics operations
  getHealthMetrics(processorId: string, limit?: number): Promise<HealthMetric[]>;
  createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  getLatestHealthMetrics(): Promise<HealthMetric[]>;
  
  // System logs operations
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(limit?: number, level?: string): Promise<SystemLog[]>;
  
  // Aggregate operations
  getSystemStats(): Promise<{
    totalTransactions: number;
    successRate: number;
    avgResponseTime: number;
    activeProcessors: number;
  }>;
}

export class MemStorage implements IStorage {
  private processors: Map<string, Processor>;
  private transactions: Map<string, Transaction>;
  private healthMetrics: Map<string, HealthMetric>;
  private systemLogs: Map<string, SystemLog>;

  constructor() {
    this.processors = new Map();
    this.transactions = new Map();
    this.healthMetrics = new Map();
    this.systemLogs = new Map();
    
    // Initialize with mock processors
    this.initializeMockProcessors();
  }

  private async initializeMockProcessors() {
    const mockProcessors: InsertProcessor[] = [
      {
        name: "Stripe",
        type: "stripe",
        priority: 1,
        enabled: true,
        successRate: "99.2",
        responseTime: 150,
        config: { apiKey: "mock_stripe_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "PayPal",
        type: "paypal",
        priority: 2,
        enabled: true,
        successRate: "97.8",
        responseTime: 220,
        config: { clientId: "mock_paypal_id" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Square",
        type: "square",
        priority: 3,
        enabled: true,
        successRate: "95.1",
        responseTime: 180,
        config: { appId: "mock_square_app" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
    ];

    for (const processor of mockProcessors) {
      await this.createProcessor(processor);
    }
  }

  // Processor operations
  async getProcessor(id: string): Promise<Processor | undefined> {
    return this.processors.get(id);
  }

  async getProcessorByName(name: string): Promise<Processor | undefined> {
    return Array.from(this.processors.values()).find(p => p.name === name);
  }

  async getAllProcessors(): Promise<Processor[]> {
    return Array.from(this.processors.values()).sort((a, b) => a.priority - b.priority);
  }

  async getActiveProcessors(): Promise<Processor[]> {
    return Array.from(this.processors.values())
      .filter(p => p.enabled && !p.circuitBreakerOpen)
      .sort((a, b) => a.priority - b.priority);
  }

  async createProcessor(insertProcessor: InsertProcessor): Promise<Processor> {
    const id = randomUUID();
    const now = new Date();
    const processor: Processor = {
      name: insertProcessor.name,
      type: insertProcessor.type,
      priority: insertProcessor.priority || 1,
      enabled: insertProcessor.enabled !== undefined ? insertProcessor.enabled : true,
      successRate: insertProcessor.successRate || "100.00",
      responseTime: insertProcessor.responseTime || 250,
      config: insertProcessor.config || {},
      circuitBreakerOpen: insertProcessor.circuitBreakerOpen || false,
      consecutiveFailures: insertProcessor.consecutiveFailures || 0,
      lastFailureTime: insertProcessor.lastFailureTime || null,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.processors.set(id, processor);
    return processor;
  }

  async updateProcessor(id: string, updates: Partial<Processor>): Promise<Processor | undefined> {
    const processor = this.processors.get(id);
    if (!processor) return undefined;
    
    const updatedProcessor: Processor = {
      ...processor,
      ...updates,
      updatedAt: new Date(),
    };
    this.processors.set(id, updatedProcessor);
    return updatedProcessor;
  }

  async deleteProcessor(id: string): Promise<boolean> {
    return this.processors.delete(id);
  }

  // Transaction operations
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactions(limit = 50, offset = 0): Promise<Transaction[]> {
    const allTransactions = Array.from(this.transactions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return allTransactions.slice(offset, offset + limit);
  }

  async getRecentTransactions(limit = 10): Promise<Transaction[]> {
    return this.getTransactions(limit, 0);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const now = new Date();
    const transaction: Transaction = {
      amount: insertTransaction.amount,
      currency: insertTransaction.currency || "USD",
      status: insertTransaction.status,
      processorId: insertTransaction.processorId || null,
      failureReason: insertTransaction.failureReason || null,
      attemptedProcessors: insertTransaction.attemptedProcessors || [],
      metadata: insertTransaction.metadata || {},
      id,
      createdAt: now,
      updatedAt: now,
      processorTransactionId: null,
      processingTime: null,
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction: Transaction = {
      ...transaction,
      ...updates,
      updatedAt: new Date(),
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  // Health metrics operations
  async getHealthMetrics(processorId: string, limit = 50): Promise<HealthMetric[]> {
    return Array.from(this.healthMetrics.values())
      .filter(m => m.processorId === processorId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createHealthMetric(insertMetric: InsertHealthMetric): Promise<HealthMetric> {
    const id = randomUUID();
    const metric: HealthMetric = {
      processorId: insertMetric.processorId,
      successCount: insertMetric.successCount || 0,
      failureCount: insertMetric.failureCount || 0,
      avgResponseTime: insertMetric.avgResponseTime || "0.00",
      totalTransactions: insertMetric.totalTransactions || 0,
      id,
      timestamp: new Date(),
    };
    this.healthMetrics.set(id, metric);
    return metric;
  }

  async getLatestHealthMetrics(): Promise<HealthMetric[]> {
    const latestMetrics = new Map<string, HealthMetric>();
    
    for (const metric of Array.from(this.healthMetrics.values())) {
      const existing = latestMetrics.get(metric.processorId);
      if (!existing || new Date(metric.timestamp) > new Date(existing.timestamp)) {
        latestMetrics.set(metric.processorId, metric);
      }
    }
    
    return Array.from(latestMetrics.values());
  }

  // System logs operations
  async createSystemLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const id = randomUUID();
    const log: SystemLog = {
      level: insertLog.level,
      message: insertLog.message,
      service: insertLog.service,
      transactionId: insertLog.transactionId || null,
      processorId: insertLog.processorId || null,
      metadata: insertLog.metadata || {},
      id,
      timestamp: new Date(),
    };
    this.systemLogs.set(id, log);
    return log;
  }

  async getSystemLogs(limit = 100, level?: string): Promise<SystemLog[]> {
    let logs = Array.from(this.systemLogs.values());
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Aggregate operations
  async getSystemStats(): Promise<{
    totalTransactions: number;
    successRate: number;
    avgResponseTime: number;
    activeProcessors: number;
  }> {
    const transactions = Array.from(this.transactions.values());
    const processors = await this.getActiveProcessors();
    
    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(t => t.status === 'success').length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    
    const completedTransactions = transactions.filter(t => t.processingTime !== null);
    const avgResponseTime = completedTransactions.length > 0 
      ? completedTransactions.reduce((sum, t) => sum + (t.processingTime || 0), 0) / completedTransactions.length
      : 0;
    
    return {
      totalTransactions,
      successRate: Math.round(successRate * 10) / 10,
      avgResponseTime: Math.round(avgResponseTime),
      activeProcessors: processors.length,
    };
  }
}

export const storage = new MemStorage();
