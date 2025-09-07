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
  getTotalTransactionCount(): Promise<number>;
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
      {
        name: "Adyen",
        type: "adyen",
        priority: 4,
        enabled: true,
        successRate: "98.5",
        responseTime: 165,
        config: { merchantAccount: "mock_adyen_merchant", apiKey: "mock_adyen_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Authorize.Net",
        type: "authorize_net",
        priority: 5,
        enabled: true,
        successRate: "96.7",
        responseTime: 240,
        config: { apiLoginId: "mock_auth_login", transactionKey: "mock_auth_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Braintree",
        type: "braintree",
        priority: 6,
        enabled: true,
        successRate: "97.3",
        responseTime: 190,
        config: { merchantId: "mock_braintree_merchant", publicKey: "mock_braintree_pub" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Checkout.com",
        type: "checkout",
        priority: 7,
        enabled: true,
        successRate: "98.1",
        responseTime: 175,
        config: { secretKey: "mock_checkout_secret", publicKey: "mock_checkout_pub" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "WorldPay",
        type: "worldpay",
        priority: 8,
        enabled: true,
        successRate: "94.2",
        responseTime: 280,
        config: { serviceKey: "mock_worldpay_service", clientKey: "mock_worldpay_client" },
        circuitBreakerOpen: false,
        consecutiveFailures: 3,
      },
      {
        name: "First Data",
        type: "first_data",
        priority: 9,
        enabled: true,
        successRate: "93.8",
        responseTime: 320,
        config: { storeId: "mock_fd_store", sharedSecret: "mock_fd_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Klarna",
        type: "klarna",
        priority: 10,
        enabled: true,
        successRate: "96.9",
        responseTime: 210,
        config: { username: "mock_klarna_user", password: "mock_klarna_pass" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Afterpay",
        type: "afterpay",
        priority: 11,
        enabled: true,
        successRate: "95.5",
        responseTime: 250,
        config: { merchantId: "mock_afterpay_merchant", secretKey: "mock_afterpay_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "Apple Pay",
        type: "apple_pay",
        priority: 12,
        enabled: true,
        successRate: "98.7",
        responseTime: 140,
        config: { merchantId: "mock_apple_merchant", certificateId: "mock_apple_cert" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Google Pay",
        type: "google_pay",
        priority: 13,
        enabled: true,
        successRate: "98.3",
        responseTime: 155,
        config: { merchantId: "mock_google_merchant", environment: "TEST" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Amazon Pay",
        type: "amazon_pay",
        priority: 14,
        enabled: true,
        successRate: "97.1",
        responseTime: 200,
        config: { sellerId: "mock_amazon_seller", clientId: "mock_amazon_client" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Dwolla",
        type: "dwolla",
        priority: 15,
        enabled: true,
        successRate: "94.6",
        responseTime: 290,
        config: { key: "mock_dwolla_key", secret: "mock_dwolla_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "Flutterwave",
        type: "flutterwave",
        priority: 16,
        enabled: true,
        successRate: "93.2",
        responseTime: 340,
        config: { publicKey: "mock_flutter_pub", secretKey: "mock_flutter_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 4,
      },
      {
        name: "Razorpay",
        type: "razorpay",
        priority: 17,
        enabled: true,
        successRate: "96.4",
        responseTime: 230,
        config: { keyId: "mock_razor_key", keySecret: "mock_razor_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Mollie",
        type: "mollie",
        priority: 18,
        enabled: true,
        successRate: "95.8",
        responseTime: 260,
        config: { apiKey: "mock_mollie_key", profileId: "mock_mollie_profile" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Wise (TransferWise)",
        type: "wise",
        priority: 19,
        enabled: true,
        successRate: "97.4",
        responseTime: 195,
        config: { apiToken: "mock_wise_token", profileId: "mock_wise_profile" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Paystack",
        type: "paystack",
        priority: 20,
        enabled: true,
        successRate: "94.7",
        responseTime: 275,
        config: { secretKey: "mock_paystack_secret", publicKey: "mock_paystack_pub" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Coinbase Commerce",
        type: "coinbase",
        priority: 21,
        enabled: true,
        successRate: "92.3",
        responseTime: 380,
        config: { apiKey: "mock_coinbase_key", webhookSecret: "mock_coinbase_webhook" },
        circuitBreakerOpen: false,
        consecutiveFailures: 3,
      },
      {
        name: "2Checkout",
        type: "2checkout",
        priority: 22,
        enabled: true,
        successRate: "93.9",
        responseTime: 310,
        config: { merchantCode: "mock_2co_merchant", secretKey: "mock_2co_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "BlueSnap",
        type: "bluesnap",
        priority: 23,
        enabled: true,
        successRate: "96.1",
        responseTime: 210,
        config: { username: "mock_blue_user", password: "mock_blue_pass" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Paymi",
        type: "paymi",
        priority: 24,
        enabled: true,
        successRate: "94.3",
        responseTime: 290,
        config: { merchantId: "mock_paymi_merchant", apiKey: "mock_paymi_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "Skrill",
        type: "skrill",
        priority: 25,
        enabled: true,
        successRate: "95.6",
        responseTime: 245,
        config: { email: "mock_skrill_email", secretWord: "mock_skrill_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Neteller",
        type: "neteller",
        priority: 26,
        enabled: true,
        successRate: "94.8",
        responseTime: 265,
        config: { clientId: "mock_neteller_client", clientSecret: "mock_neteller_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "PayU",
        type: "payu",
        priority: 27,
        enabled: true,
        successRate: "93.5",
        responseTime: 325,
        config: { posId: "mock_payu_pos", secondKey: "mock_payu_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 3,
      },
      {
        name: "Payme",
        type: "payme",
        priority: 28,
        enabled: true,
        successRate: "96.8",
        responseTime: 185,
        config: { storeKey: "mock_payme_store", password: "mock_payme_pass" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "ePayments",
        type: "epayments",
        priority: 29,
        enabled: true,
        successRate: "92.7",
        responseTime: 355,
        config: { clientId: "mock_epay_client", clientSecret: "mock_epay_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 4,
      },
      {
        name: "Payoneer",
        type: "payoneer",
        priority: 30,
        enabled: true,
        successRate: "95.2",
        responseTime: 235,
        config: { programId: "mock_payoneer_program", username: "mock_payoneer_user" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Alipay",
        type: "alipay",
        priority: 31,
        enabled: true,
        successRate: "98.9",
        responseTime: 125,
        config: { appId: "mock_alipay_app", privateKey: "mock_alipay_private" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "WeChat Pay",
        type: "wechat_pay",
        priority: 32,
        enabled: true,
        successRate: "98.6",
        responseTime: 135,
        config: { mchId: "mock_wechat_mch", apiKey: "mock_wechat_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "UnionPay",
        type: "unionpay",
        priority: 33,
        enabled: true,
        successRate: "97.3",
        responseTime: 165,
        config: { merId: "mock_union_mer", certId: "mock_union_cert" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "JCB",
        type: "jcb",
        priority: 34,
        enabled: true,
        successRate: "96.5",
        responseTime: 205,
        config: { merchantId: "mock_jcb_merchant", terminalId: "mock_jcb_terminal" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Diners Club",
        type: "diners",
        priority: 35,
        enabled: true,
        successRate: "95.7",
        responseTime: 225,
        config: { merchantId: "mock_diners_merchant", secretKey: "mock_diners_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Discover",
        type: "discover",
        priority: 36,
        enabled: true,
        successRate: "96.9",
        responseTime: 175,
        config: { merchantId: "mock_discover_merchant", password: "mock_discover_pass" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "American Express",
        type: "amex",
        priority: 37,
        enabled: true,
        successRate: "97.8",
        responseTime: 155,
        config: { merchantId: "mock_amex_merchant", userId: "mock_amex_user" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Mastercard",
        type: "mastercard",
        priority: 38,
        enabled: true,
        successRate: "98.4",
        responseTime: 145,
        config: { merchantId: "mock_mc_merchant", apiKey: "mock_mc_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Visa",
        type: "visa",
        priority: 39,
        enabled: true,
        successRate: "98.7",
        responseTime: 140,
        config: { merchantId: "mock_visa_merchant", sharedSecret: "mock_visa_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Eway",
        type: "eway",
        priority: 40,
        enabled: true,
        successRate: "94.1",
        responseTime: 285,
        config: { apiKey: "mock_eway_key", password: "mock_eway_pass" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "SecurePay",
        type: "securepay",
        priority: 41,
        enabled: true,
        successRate: "93.8",
        responseTime: 295,
        config: { merchantId: "mock_secure_merchant", password: "mock_secure_pass" },
        circuitBreakerOpen: false,
        consecutiveFailures: 3,
      },
      {
        name: "Pin Payments",
        type: "pin_payments",
        priority: 42,
        enabled: true,
        successRate: "95.4",
        responseTime: 215,
        config: { secretKey: "mock_pin_secret", publishableKey: "mock_pin_pub" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Bambora",
        type: "bambora",
        priority: 43,
        enabled: true,
        successRate: "96.2",
        responseTime: 195,
        config: { merchantId: "mock_bambora_merchant", apiToken: "mock_bambora_token" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Moneris",
        type: "moneris",
        priority: 44,
        enabled: true,
        successRate: "94.9",
        responseTime: 275,
        config: { storeId: "mock_moneris_store", apiToken: "mock_moneris_token" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "Global Payments",
        type: "global_payments",
        priority: 45,
        enabled: true,
        successRate: "95.8",
        responseTime: 225,
        config: { appId: "mock_global_app", appKey: "mock_global_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "CyberSource",
        type: "cybersource",
        priority: 46,
        enabled: true,
        successRate: "96.7",
        responseTime: 185,
        config: { merchantId: "mock_cyber_merchant", sharedSecret: "mock_cyber_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Elavon",
        type: "elavon",
        priority: 47,
        enabled: true,
        successRate: "94.3",
        responseTime: 305,
        config: { storeId: "mock_elavon_store", userId: "mock_elavon_user" },
        circuitBreakerOpen: false,
        consecutiveFailures: 3,
      },
      {
        name: "TSYS",
        type: "tsys",
        priority: 48,
        enabled: true,
        successRate: "93.6",
        responseTime: 325,
        config: { deviceId: "mock_tsys_device", transactionKey: "mock_tsys_key" },
        circuitBreakerOpen: false,
        consecutiveFailures: 4,
      },
      {
        name: "PayPal Credit",
        type: "paypal_credit",
        priority: 49,
        enabled: true,
        successRate: "96.1",
        responseTime: 255,
        config: { clientId: "mock_pp_credit_client", clientSecret: "mock_pp_credit_secret" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Affirm",
        type: "affirm",
        priority: 50,
        enabled: true,
        successRate: "94.7",
        responseTime: 285,
        config: { publicApiKey: "mock_affirm_pub", privateApiKey: "mock_affirm_private" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "Sezzle",
        type: "sezzle",
        priority: 51,
        enabled: true,
        successRate: "93.9",
        responseTime: 295,
        config: { merchantId: "mock_sezzle_merchant", privateKey: "mock_sezzle_private" },
        circuitBreakerOpen: false,
        consecutiveFailures: 3,
      },
      {
        name: "Zip (Quadpay)",
        type: "zip",
        priority: 52,
        enabled: true,
        successRate: "94.5",
        responseTime: 275,
        config: { merchantKey: "mock_zip_merchant", apiKey: "mock_zip_api" },
        circuitBreakerOpen: false,
        consecutiveFailures: 2,
      },
      {
        name: "PayBright",
        type: "paybright",
        priority: 53,
        enabled: true,
        successRate: "95.3",
        responseTime: 245,
        config: { apiToken: "mock_paybright_token", webhookToken: "mock_paybright_webhook" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "Splitit",
        type: "splitit",
        priority: 54,
        enabled: true,
        successRate: "93.1",
        responseTime: 335,
        config: { apiKey: "mock_splitit_key", userName: "mock_splitit_user" },
        circuitBreakerOpen: false,
        consecutiveFailures: 4,
      },
      {
        name: "Paidy",
        type: "paidy",
        priority: 55,
        enabled: true,
        successRate: "96.8",
        responseTime: 205,
        config: { apiKey: "mock_paidy_key", storeId: "mock_paidy_store" },
        circuitBreakerOpen: false,
        consecutiveFailures: 0,
      },
      {
        name: "Mercado Pago",
        type: "mercado_pago",
        priority: 56,
        enabled: true,
        successRate: "95.7",
        responseTime: 235,
        config: { accessToken: "mock_mercado_token", clientId: "mock_mercado_client" },
        circuitBreakerOpen: false,
        consecutiveFailures: 1,
      },
      {
        name: "PicPay",
        type: "picpay",
        priority: 57,
        enabled: true,
        successRate: "94.2",
        responseTime: 295,
        config: { picpayToken: "mock_picpay_token", sellerToken: "mock_picpay_seller" },
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

  async getTotalTransactionCount(): Promise<number> {
    return this.transactions.size;
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
