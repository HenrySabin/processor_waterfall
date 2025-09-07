import { storage } from "../storage";
import { logger } from "../utils/logger";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // in milliseconds
  monitoringWindow: number; // in milliseconds
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '3'),
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'), // 1 minute
      monitoringWindow: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_WINDOW || '300000'), // 5 minutes
      ...config,
    };
  }

  async checkProcessor(processorId: string): Promise<boolean> {
    const processor = await storage.getProcessor(processorId);
    if (!processor) {
      logger.error(`Processor not found: ${processorId}`, 'circuit-breaker');
      return false;
    }

    // If circuit breaker is not open, processor is available
    if (!processor.circuitBreakerOpen) {
      return true;
    }

    // Check if enough time has passed to attempt reset
    if (processor.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - new Date(processor.lastFailureTime).getTime();
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        // Attempt to reset circuit breaker
        await this.resetCircuitBreaker(processorId);
        logger.info(`Circuit breaker reset attempted for processor ${processor.name}`, 'circuit-breaker');
        return true;
      }
    }

    logger.warn(`Circuit breaker open for processor ${processor.name}`, 'circuit-breaker');
    return false;
  }

  async recordSuccess(processorId: string): Promise<void> {
    const processor = await storage.getProcessor(processorId);
    if (!processor) return;

    // Reset consecutive failures on success
    await storage.updateProcessor(processorId, {
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
    });

    logger.debug(`Success recorded for processor ${processor.name}`, 'circuit-breaker');
  }

  async recordFailure(processorId: string): Promise<void> {
    const processor = await storage.getProcessor(processorId);
    if (!processor) return;

    const newConsecutiveFailures = processor.consecutiveFailures + 1;
    const shouldOpenCircuit = newConsecutiveFailures >= this.config.failureThreshold;

    await storage.updateProcessor(processorId, {
      consecutiveFailures: newConsecutiveFailures,
      circuitBreakerOpen: shouldOpenCircuit,
      lastFailureTime: new Date(),
    });

    if (shouldOpenCircuit) {
      logger.warn(
        `Circuit breaker opened for processor ${processor.name} after ${newConsecutiveFailures} consecutive failures`,
        'circuit-breaker'
      );
    } else {
      logger.debug(
        `Failure recorded for processor ${processor.name} (${newConsecutiveFailures}/${this.config.failureThreshold})`,
        'circuit-breaker'
      );
    }
  }

  private async resetCircuitBreaker(processorId: string): Promise<void> {
    await storage.updateProcessor(processorId, {
      circuitBreakerOpen: false,
      consecutiveFailures: 0,
    });
  }

  async getCircuitBreakerStatus(): Promise<Array<{ processorId: string; name: string; isOpen: boolean; consecutiveFailures: number }>> {
    const processors = await storage.getAllProcessors();
    return processors.map(p => ({
      processorId: p.id,
      name: p.name,
      isOpen: p.circuitBreakerOpen,
      consecutiveFailures: p.consecutiveFailures,
    }));
  }
}

export const circuitBreaker = new CircuitBreaker();
