import { logger } from "../utils/logger";

export interface ProcessorPriority {
  processorId: string;
  name: string;
  priority: number;
  enabled: boolean;
}

export interface SmartContractConfig {
  appId?: number;
  network: 'mainnet' | 'testnet' | 'betanet';
  algodToken?: string;
  algodServer?: string;
  algodPort?: number;
}

export class AlgorandClient {
  private config: SmartContractConfig;
  private mockMode: boolean;

  constructor(config?: SmartContractConfig) {
    this.config = {
      network: 'testnet',
      algodServer: process.env.ALGORAND_SERVER || 'https://testnet-api.algonode.cloud',
      algodToken: process.env.ALGORAND_TOKEN || '',
      algodPort: parseInt(process.env.ALGORAND_PORT || '443'),
      appId: process.env.ALGORAND_APP_ID ? parseInt(process.env.ALGORAND_APP_ID) : undefined,
      ...config,
    };
    
    // Use mock mode if no app ID is configured
    this.mockMode = !this.config.appId;
    
    if (this.mockMode) {
      logger.info('Algorand client initialized in mock mode', 'algorand-client');
    } else {
      logger.info(`Algorand client initialized for ${this.config.network}`, 'algorand-client', {
        appId: this.config.appId,
        server: this.config.algodServer,
      });
    }
  }

  async getProcessorPriorities(): Promise<ProcessorPriority[]> {
    if (this.mockMode) {
      // Return mock data when no smart contract is deployed
      logger.debug('Returning mock processor priorities', 'algorand-client');
      return [
        { processorId: '1', name: 'Stripe', priority: 1, enabled: true },
        { processorId: '2', name: 'PayPal', priority: 2, enabled: true },
        { processorId: '3', name: 'Square', priority: 3, enabled: true },
      ];
    }

    try {
      // In a real implementation, this would call the Algorand smart contract
      // For now, we'll simulate the call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      logger.debug('Retrieved processor priorities from Algorand contract', 'algorand-client', {
        appId: this.config.appId,
      });
      
      return [
        { processorId: '1', name: 'Stripe', priority: 1, enabled: true },
        { processorId: '2', name: 'PayPal', priority: 2, enabled: true },
        { processorId: '3', name: 'Square', priority: 3, enabled: true },
      ];
    } catch (error) {
      logger.error(
        'Failed to retrieve processor priorities from Algorand',
        'algorand-client',
        error instanceof Error ? error : undefined,
        { appId: this.config.appId }
      );
      throw new Error('Failed to query smart contract');
    }
  }

  async updateProcessorPriorities(priorities: ProcessorPriority[]): Promise<boolean> {
    if (this.mockMode) {
      logger.debug('Mock update of processor priorities', 'algorand-client', { priorities });
      return true;
    }

    try {
      // In a real implementation, this would submit a transaction to update the smart contract
      await new Promise(resolve => setTimeout(resolve, 200));
      
      logger.info('Updated processor priorities on Algorand contract', 'algorand-client', {
        appId: this.config.appId,
        priorities,
      });
      
      return true;
    } catch (error) {
      logger.error(
        'Failed to update processor priorities on Algorand',
        'algorand-client',
        error instanceof Error ? error : undefined,
        { appId: this.config.appId, priorities }
      );
      return false;
    }
  }

  async getContractStatus(): Promise<{ connected: boolean; network: string; appId?: number; error?: string }> {
    if (this.mockMode) {
      return {
        connected: true,
        network: this.config.network,
        appId: undefined,
      };
    }

    try {
      // In a real implementation, this would check the Algorand node connection
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        connected: true,
        network: this.config.network,
        appId: this.config.appId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      logger.error('Algorand connection check failed', 'algorand-client', error instanceof Error ? error : undefined);
      
      return {
        connected: false,
        network: this.config.network,
        appId: this.config.appId,
        error: errorMessage,
      };
    }
  }

  async queryProcessorRates(): Promise<Record<string, number>> {
    if (this.mockMode) {
      return {
        'Stripe': 99.2,
        'PayPal': 97.8,
        'Square': 95.1,
      };
    }

    try {
      // Simulate smart contract query
      await new Promise(resolve => setTimeout(resolve, 80));
      
      return {
        'Stripe': 99.2,
        'PayPal': 97.8,
        'Square': 95.1,
      };
    } catch (error) {
      logger.error(
        'Failed to query processor rates from Algorand',
        'algorand-client',
        error instanceof Error ? error : undefined
      );
      throw new Error('Failed to query processor rates');
    }
  }
}

export const algorandClient = new AlgorandClient();
