import { logger } from "../utils/logger";

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  processingTime: number;
  errorMessage?: string;
  errorCode?: string;
}

export class StripeAdapter {
  private apiKey: string;
  private baseSuccessRate: number;

  constructor(apiKey: string, successRate = 99.2) {
    this.apiKey = apiKey;
    this.baseSuccessRate = successRate;
  }

  async processPayment(amount: string, currency: string, metadata: Record<string, any> = {}): Promise<PaymentResult> {
    const startTime = Date.now();
    
    try {
      // Simulate API delay
      const delay = this.getRandomDelay(100, 200);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simulate success/failure based on configured rate
      const success = Math.random() * 100 < this.baseSuccessRate;
      const processingTime = Date.now() - startTime;
      
      if (success) {
        const transactionId = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.debug(
          `Stripe payment processed successfully: ${amount} ${currency}`,
          'stripe-adapter',
          { transactionId, processingTime, metadata }
        );
        
        return {
          success: true,
          transactionId,
          processingTime,
        };
      } else {
        const errorMessages = [
          'Card declined',
          'Insufficient funds',
          'Invalid card number',
          'Card expired',
          'Processing error',
        ];
        const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        const errorCode = `stripe_error_${Math.floor(Math.random() * 1000)}`;
        
        logger.warn(
          `Stripe payment failed: ${errorMessage}`,
          'stripe-adapter',
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
        `Stripe adapter error: ${errorMessage}`,
        'stripe-adapter',
        error instanceof Error ? error : undefined,
        { amount, currency, processingTime, metadata }
      );
      
      return {
        success: false,
        processingTime,
        errorMessage: 'Payment processor error',
        errorCode: 'stripe_system_error',
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
      await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(50, 100)));
      
      const responseTime = Date.now() - startTime;
      const healthy = Math.random() > 0.05; // 95% health check success rate
      
      return {
        healthy,
        responseTime,
        error: healthy ? undefined : 'Stripe API health check failed',
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
