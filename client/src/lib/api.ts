import { apiRequest } from "./queryClient";

export interface SystemStats {
  totalTransactions: number;
  successRate: number;
  avgResponseTime: number;
  activeProcessors: number;
}

export interface ProcessorStatus {
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
}

export interface Transaction {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  processorId: string | null;
  processingTime: number | null;
  createdAt: Date;
  failureReason: string | null;
}

export interface HealthCheck {
  status: string;
  timestamp: string;
  system: {
    api: string;
    database: string;
    uptime: number;
  };
  metrics: SystemStats;
  processors: Array<{
    name: string;
    enabled: boolean;
    circuitBreakerOpen: boolean;
    successRate: string;
    avgResponseTime: number;
  }>;
  smartContract: {
    connected: boolean;
    network: string;
    appId?: number;
    error?: string;
  };
}

export interface PaymentRequest {
  amount: string;
  currency: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  amount: string;
  currency: string;
  status: string;
  processorUsed?: string;
  processingTime: number;
  createdAt: Date;
  error?: string;
  details?: string;
  attemptedProcessors?: string[];
}

export const api = {
  // Health and monitoring
  async getHealth(): Promise<HealthCheck> {
    const res = await apiRequest('GET', '/api/health');
    return await res.json();
  },

  async getMetrics(): Promise<{
    stats: SystemStats;
    recentTransactions: Transaction[];
    processors: ProcessorStatus[];
    timestamp: string;
  }> {
    const res = await apiRequest('GET', '/api/metrics');
    return await res.json();
  },

  async runHealthCheck(): Promise<any> {
    const res = await apiRequest('POST', '/api/health-check');
    return await res.json();
  },

  // Payments
  async processPayment(payment: PaymentRequest): Promise<PaymentResponse> {
    const res = await apiRequest('POST', '/api/payments', payment);
    return await res.json();
  },

  async getPayment(id: string): Promise<Transaction> {
    const res = await apiRequest('GET', `/api/payments/${id}`);
    return await res.json();
  },

  async getTransactions(limit = 20, offset = 0): Promise<{
    transactions: Transaction[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    const res = await apiRequest('GET', `/api/transactions?limit=${limit}&offset=${offset}`);
    return await res.json();
  },

  // Processors
  async getProcessors(): Promise<{
    processors: ProcessorStatus[];
    timestamp: string;
  }> {
    const res = await apiRequest('GET', '/api/processors');
    return await res.json();
  },

  async toggleProcessor(id: string): Promise<{
    success: boolean;
    processorId: string;
    enabled: boolean;
    message: string;
  }> {
    const res = await apiRequest('POST', `/api/processors/${id}/toggle`);
    return await res.json();
  },

  // Smart contract
  async getSmartContractStatus(): Promise<{
    connected: boolean;
    network: string;
    appId?: number;
    error?: string;
  }> {
    const res = await apiRequest('GET', '/api/smart-contract/status');
    return await res.json();
  },

  // Logs
  async getLogs(limit = 50, level?: string): Promise<{
    logs: Array<{
      id: string;
      level: string;
      message: string;
      service: string;
      timestamp: Date;
      transactionId: string | null;
      processorId: string | null;
    }>;
  }> {
    const query = level ? `?limit=${limit}&level=${level}` : `?limit=${limit}`;
    const res = await apiRequest('GET', `/api/logs${query}`);
    return await res.json();
  },
};
