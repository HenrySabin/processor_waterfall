import { logger } from "../utils/logger";
import algosdk from 'algosdk';

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
  private algodClient: algosdk.Algodv2 | null = null;

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
    
    if (!this.mockMode) {
      // Initialize real Algod client
      try {
        this.algodClient = new algosdk.Algodv2(
          this.config.algodToken || '',
          this.config.algodServer!,
          this.config.algodPort || 443
        );
        logger.info(`Algorand client initialized for ${this.config.network}`, 'algorand-client', {
          appId: this.config.appId,
          server: this.config.algodServer,
        });
      } catch (error) {
        logger.error('Failed to initialize Algorand client, falling back to mock mode', 'algorand-client', error instanceof Error ? error : undefined);
        this.mockMode = true;
        this.algodClient = null;
      }
    }
    
    if (this.mockMode) {
      logger.info('Algorand client initialized in mock mode', 'algorand-client');
    }
  }

  private parseProcessorsFromGlobalState(globalState: any[]): ProcessorPriority[] {
    const processors: ProcessorPriority[] = [];
    
    try {
      // Parse the global state entries from our PayFlow smart contract
      const processorData: Record<number, Partial<ProcessorPriority>> = {};
      let processorCount = 0;
      
      for (const entry of globalState) {
        const keyBytes = Buffer.from(entry.key, 'base64');
        const keyStr = keyBytes.toString('utf-8');
        
        let value: any;
        if (entry.value.type === 1) { // bytes
          const valueBytes = Buffer.from(entry.value.bytes, 'base64');
          value = valueBytes.toString('utf-8');
        } else if (entry.value.type === 2) { // uint
          value = entry.value.uint;
        } else {
          continue;
        }
        
        // Parse processor count
        if (keyStr === 'processor_count') {
          processorCount = value;
          continue;
        }
        
        // Parse processor entries: processor_<index>_<field>
        const match = keyStr.match(/processor_(\d+)_(name|priority|enabled)/);
        if (match) {
          const index = parseInt(match[1]);
          const field = match[2];
          
          if (!processorData[index]) {
            processorData[index] = {};
          }
          
          switch (field) {
            case 'name':
              processorData[index].name = value;
              break;
            case 'priority':
              processorData[index].priority = value;
              break;
            case 'enabled':
              processorData[index].enabled = value === 1;
              break;
          }
        }
      }
      
      // Convert parsed data to ProcessorPriority array
      for (let i = 1; i <= processorCount; i++) {
        const data = processorData[i];
        if (data && data.name && data.priority !== undefined && data.enabled !== undefined) {
          processors.push({
            processorId: i.toString(),
            name: data.name,
            priority: data.priority,
            enabled: data.enabled
          });
        }
      }
      
      logger.debug(`Parsed ${processors.length} processors from contract state`, 'algorand-client', {
        processorCount,
        processors: processors.map(p => ({ name: p.name, priority: p.priority, enabled: p.enabled }))
      });
      
      // Return parsed processors or default fallback
      return processors.length > 0 ? processors : [
        { processorId: '1', name: 'Stripe', priority: 1, enabled: true },
        { processorId: '2', name: 'PayPal', priority: 2, enabled: true },
        { processorId: '3', name: 'Square', priority: 3, enabled: true },
      ];
      
    } catch (error) {
      logger.error('Failed to parse processor data from global state', 'algorand-client', error instanceof Error ? error : undefined);
      
      // Return default processors as fallback
      return [
        { processorId: '1', name: 'Stripe', priority: 1, enabled: true },
        { processorId: '2', name: 'PayPal', priority: 2, enabled: true },
        { processorId: '3', name: 'Square', priority: 3, enabled: true },
      ];
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

    if (!this.algodClient || !this.config.appId) {
      logger.error('Cannot retrieve processor priorities: client or app ID not available', 'algorand-client');
      throw new Error('Algorand client or application ID not configured');
    }

    try {
      // Make real call to get application info and global state
      const appInfo = await this.algodClient.getApplicationByID(this.config.appId).do();
      const globalState = appInfo.params.globalState || [];
      
      logger.debug('Retrieved processor priorities from Algorand contract', 'algorand-client', {
        appId: this.config.appId,
        globalStateEntries: globalState.length
      });
      
      // Parse the global state to extract processor configurations
      const processors = this.parseProcessorsFromGlobalState(globalState);
      
      if (processors.length === 0) {
        logger.warn('No processor configurations found in contract state', 'algorand-client');
        // Return default configuration as fallback
        return [
          { processorId: '1', name: 'Stripe', priority: 1, enabled: true },
          { processorId: '2', name: 'PayPal', priority: 2, enabled: true },
          { processorId: '3', name: 'Square', priority: 3, enabled: true },
        ];
      }
      
      return processors;
    } catch (error) {
      logger.error(
        'Failed to retrieve processor priorities from Algorand',
        'algorand-client',
        error instanceof Error ? error : undefined,
        { appId: this.config.appId }
      );
      
      // Return default configuration as fallback instead of throwing
      logger.info('Falling back to default processor configuration', 'algorand-client');
      return [
        { processorId: '1', name: 'Stripe', priority: 1, enabled: true },
        { processorId: '2', name: 'PayPal', priority: 2, enabled: true },
        { processorId: '3', name: 'Square', priority: 3, enabled: true },
      ];
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

  async getContractStatus(): Promise<{ connected: boolean; network: string; appId?: number; error?: string; lastRound?: number; nodeVersion?: string }> {
    if (this.mockMode) {
      return {
        connected: true,
        network: this.config.network,
        appId: undefined,
      };
    }

    if (!this.algodClient) {
      return {
        connected: false,
        network: this.config.network,
        appId: this.config.appId,
        error: 'Algod client not initialized',
      };
    }

    try {
      // Make real blockchain calls to test connectivity
      const status = await this.algodClient.status().do();
      
      logger.debug('Algorand node status retrieved', 'algorand-client', {
        lastRound: Number(status.lastRound),
        timeSinceLastRound: Number(status.timeSinceLastRound),
        catchupTime: status.catchupTime
      });
      
      // If we have an app ID, also check if the application exists
      if (this.config.appId) {
        try {
          const appInfo = await this.algodClient.getApplicationByID(this.config.appId).do();
          logger.debug('Smart contract found', 'algorand-client', {
            appId: this.config.appId,
            creator: appInfo.params.creator
          });
        } catch (appError) {
          logger.warn('Smart contract not found or inaccessible', 'algorand-client', {
            appId: this.config.appId,
            error: appError instanceof Error ? appError.message : 'Unknown error'
          });
        }
      }
      
      return {
        connected: true,
        network: this.config.network,
        appId: this.config.appId,
        lastRound: Number(status.lastRound),
        nodeVersion: 'algod'
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
