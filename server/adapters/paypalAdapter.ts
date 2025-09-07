import { logger } from "../utils/logger";

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  processingTime: number;
  errorMessage?: string;
  errorCode?: string;
}

export class PayPalAdapter {
  private clientId: string;
  private baseSuccessRate: number;

  constructor(clientId: string, successRate = 97.8) {
    this.clientId = clientId;
    this.baseSuccessRate = successRate;
  }

  async processPayment(amount: string, currency: string, metadata: Record<string, any> = {}): Promise<PaymentResult> {
    const startTime = Date.now();
    
    try {
      // Simulate API delay
      const delay = this.getRandomDelay(150, 300);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simulate success/failure based on configured rate
      const success = Math.random() * 100 < this.baseSuccessRate;
      const processingTime = Date.now() - startTime;
      
      if (success) {
        const transactionId = `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.debug(
          `PayPal payment processed successfully: ${amount} ${currency}`,
          'paypal-adapter',
          { transactionId, processingTime, metadata }
        );
        
        return {
          success: true,
          transactionId,
          processingTime,
        };
      } else {
        const errorMessages = [
          'PayPal account suspended',
          'Payment declined by PayPal',
          'Invalid PayPal credentials',
          'PayPal service unavailable',
          'Transaction limit exceeded',
        ];
        const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        const errorCode = `paypal_error_${Math.floor(Math.random() * 1000)}`;
        
        logger.warn(
          `PayPal payment failed: ${errorMessage}`,
          'paypal-adapter',
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
        `PayPal adapter error: ${errorMessage}`,
        'paypal-adapter',
        error instanceof Error ? error : undefined,
        { amount, currency, processingTime, metadata }
      );
      
      return {
        success: false,
        processingTime,
        errorMessage: 'Payment processor error',
        errorCode: 'paypal_system_error',
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
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(75, 150)));
      
      const responseTime = Date.now() - startTime;
      const healthy = Math.random() > 0.08; // 92% health check success rate
      
      return {
        healthy,
        responseTime,
        error: healthy ? undefined : 'PayPal API health check failed',
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
