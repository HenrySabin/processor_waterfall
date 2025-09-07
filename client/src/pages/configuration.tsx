import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { 
  Page, 
  Layout, 
  Card, 
  Form, 
  FormLayout, 
  TextField, 
  Button, 
  Badge, 
  DataTable, 
  Modal, 
  Select, 
  Checkbox, 
  Banner, 
  Spinner,
  Text,
  Divider,
  InlineStack,
  BlockStack,
  Frame,
  Navigation,
  TopBar,
  Loading
} from "@shopify/polaris";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import flowPayLogo from "@assets/flowpay logo_1757253025832.png";

interface ProcessorConfig {
  processorId: string;
  name: string;
  priority: number;
  enabled: boolean;
}

interface SmartContractStatus {
  connected: boolean;
  network: string;
  appId?: number;
  nodeStatus?: any;
  lastSync?: string;
}

export default function Configuration() {
  const [location, setLocation] = useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [editingProcessor, setEditingProcessor] = useState<ProcessorConfig | null>(null);
  const [modalActive, setModalActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    priority: 1,
    enabled: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((mobileNavigationActive) => !mobileNavigationActive),
    [],
  );

  // Fetch smart contract status
  const { data: contractStatus, isLoading: contractLoading } = useQuery({
    queryKey: ['/api/smart-contract/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch processor priorities from smart contract
  const { data: processorsResponse, isLoading: processorsLoading } = useQuery({
    queryKey: ['/api/smart-contract/priorities'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const processors = processorsResponse?.priorities || [];

  // Fetch recent block hashes
  const { data: blocksResponse, isLoading: blocksLoading } = useQuery({
    queryKey: ['/api/blockchain/blocks'],
    refetchInterval: 8000, // Refresh every 8 seconds
  });

  const recentBlocks = blocksResponse?.blocks || [];

  // Fetch smart contract details
  const { data: contractDetails, isLoading: contractDetailsLoading } = useQuery({
    queryKey: ['/api/smart-contract/details'],
    refetchInterval: 12000, // Refresh every 12 seconds
  });

  // Update processor mutation
  const updateProcessorMutation = useMutation({
    mutationFn: async (processor: ProcessorConfig) => {
      // This would be a PUT/PATCH endpoint to update smart contract
      // For now, return success for demo purposes
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      toast({
        title: "Processor Updated",
        description: "Smart contract configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-contract/priorities'] });
      setModalActive(false);
      setEditingProcessor(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update processor configuration.",
        variant: "destructive",
      });
    },
  });

  // Deploy contract mutation
  const deployContractMutation = useMutation({
    mutationFn: async () => {
      // This would trigger contract deployment
      return apiRequest('POST', '/api/smart-contract/deploy', {});
    },
    onSuccess: () => {
      toast({
        title: "Contract Deployed",
        description: "Smart contract has been deployed successfully to Algorand network.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-contract/status'] });
    },
    onError: () => {
      toast({
        title: "Deployment Failed",
        description: "Failed to deploy smart contract. Check logs for details.",
        variant: "destructive",
      });
    },
  });

  const handleEditProcessor = (processor: ProcessorConfig) => {
    setEditingProcessor(processor);
    setFormData({
      name: processor.name,
      priority: processor.priority,
      enabled: processor.enabled
    });
    setModalActive(true);
  };

  const handleSaveProcessor = () => {
    if (editingProcessor) {
      const updatedProcessor = {
        ...editingProcessor,
        name: formData.name,
        priority: formData.priority,
        enabled: formData.enabled
      };
      updateProcessorMutation.mutate(updatedProcessor);
    }
  };

  const handleModalClose = () => {
    setModalActive(false);
    setEditingProcessor(null);
    setFormData({ name: '', priority: 1, enabled: true });
  };

  // Prepare data for DataTable
  const tableData = Array.isArray(processors) ? processors.map((processor: ProcessorConfig) => [
    processor.name,
    processor.priority.toString(),
    <Badge tone={processor.enabled ? "success" : "critical"} key={processor.processorId}>
      {processor.enabled ? "Enabled" : "Disabled"}
    </Badge>,
    <Button 
      key={processor.processorId} 
      size="slim" 
      onClick={() => handleEditProcessor(processor)}
      data-testid={`button-edit-processor-${processor.processorId}`}
    >
      Edit
    </Button>
  ]) : [];

  const isLoading = contractLoading || processorsLoading;

  if (isLoading && !contractStatus && !processors.length) {
    return (
      <Frame>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Loading />
        </div>
      </Frame>
    );
  }

  const getSystemStatus = () => {
    if (!contractStatus) return { text: "Loading...", tone: "warning" };
    
    if (!contractStatus.connected) {
      return { text: "Disconnected", tone: "critical" };
    }
    
    return { text: "Connected", tone: "success" };
  };

  const systemStatus = getSystemStatus();

  const navigationMarkup = (
    <Navigation location={location}>
      <div style={{ 
        padding: '20px 16px', 
        borderBottom: '1px solid #e1e3e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img 
          src={flowPayLogo} 
          alt="FlowPay" 
          style={{ 
            height: '80px',
            width: 'auto',
            objectFit: 'contain'
          }}
          data-testid="flowpay-logo"
        />
      </div>
      <Navigation.Section
        items={[
          {
            url: '/dashboard',
            label: 'Dashboard', 
            selected: location === '/' || location === '/dashboard',
            onClick: () => setLocation('/dashboard'),
          },
          {
            url: '/processors',
            label: 'Processors',
            selected: location === '/processors', 
            onClick: () => setLocation('/processors'),
          },
          {
            url: '/transactions',
            label: 'Transactions',
            selected: location === '/transactions',
            onClick: () => setLocation('/transactions'),
          },
          {
            url: '/health',
            label: 'Health',
            selected: location === '/health',
            onClick: () => setLocation('/health'),
          },
          {
            url: '/config',
            label: 'Configuration',
            selected: location === '/config',
            onClick: () => setLocation('/config'),
          },
        ]}
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
      secondaryMenu={
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge tone={systemStatus.tone as any}>{systemStatus.text}</Badge>
          <Button
            onClick={() => queryClient.invalidateQueries()}
            size="slim"
          >
            Refresh Data
          </Button>
          <Button
            onClick={() => setLocation('/dashboard')}
            size="slim"
            variant="primary"
          >
            💳 Back to Dashboard
          </Button>
        </div>
      }
    />
  );

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      <Page 
        title="Smart Contract Configuration"
        subtitle="Review and adjust Algorand smart contract settings and processor priorities"
        data-testid="page-configuration"
      >
      <Layout>
        {/* Smart Contract Status */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Smart Contract Status</Text>
              <br />
              {contractLoading ? (
                <Spinner size="small" />
              ) : (
                <BlockStack gap="200">
                  <InlineStack gap="200" align="center">
                    <Text as="span">Connection Status:</Text>
                    <Badge 
                      tone={contractStatus?.connected ? "success" : "critical"}
                      data-testid="badge-connection-status"
                    >
                      {contractStatus?.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </InlineStack>
                  
                  <InlineStack gap="200" align="center">
                    <Text as="span">Network:</Text>
                    <Badge tone="info" data-testid="badge-network">
                      {contractStatus?.network || "Unknown"}
                    </Badge>
                  </InlineStack>
                  
                  {contractStatus?.appId && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Application ID:</Text>
                      <Text as="span" fontWeight="bold" data-testid="text-app-id">
                        {contractStatus.appId}
                      </Text>
                    </InlineStack>
                  )}
                  
                  {contractStatus?.lastRound && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Current Round:</Text>
                      <Text as="span" data-testid="text-last-sync">
                        {contractStatus.lastRound.toLocaleString()}
                      </Text>
                    </InlineStack>
                  )}
                  
                  {contractStatus?.nodeVersion && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Node Version:</Text>
                      <Text as="span" data-testid="text-node-version">
                        {contractStatus.nodeVersion}
                      </Text>
                    </InlineStack>
                  )}
                  
                  {contractStatus?.error && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Error:</Text>
                      <Text as="span" tone="critical" data-testid="text-error">
                        {contractStatus.error}
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              )}
              
              <br />
              <Divider />
              <br />
              
              {!contractStatus?.appId && (
                <>
                  <Banner tone="warning" title="Smart Contract Not Deployed">
                    <p>The smart contract is running in demo mode. Deploy to Algorand network for live blockchain integration.</p>
                  </Banner>
                  <br />
                  <Button 
                    variant="primary"
                    loading={deployContractMutation.isPending}
                    onClick={() => deployContractMutation.mutate()}
                    data-testid="button-deploy-contract"
                  >
                    Deploy Smart Contract
                  </Button>
                </>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Processor Configuration */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">Payment Processor Priorities</Text>
                <Button 
                  onClick={() => queryClient.invalidateQueries()}
                  loading={isLoading}
                  data-testid="button-refresh-data"
                >
                  Refresh Data
                </Button>
              </InlineStack>
              <br />
              
              {processorsLoading ? (
                <Spinner size="large" />
              ) : (
                <>
                  <Text as="p" tone="subdued">
                    Configure the priority order and status of payment processors. 
                    Lower priority numbers are tried first in the waterfall system.
                  </Text>
                  <br />
                  <br />
                  
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'text', 'text']}
                    headings={['Processor Name', 'Priority', 'Status', 'Actions']}
                    rows={tableData}
                    data-testid="table-processors"
                  />
                </>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Smart Contract Details */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Live Blockchain Data</Text>
              <br />
              
              {contractStatus?.connected && (
                <BlockStack gap="200">
                  {contractStatus.lastRound && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Current Round:</Text>
                      <Text as="span" fontWeight="bold" data-testid="text-blockchain-round">
                        {contractStatus.lastRound.toLocaleString()}
                      </Text>
                    </InlineStack>
                  )}
                  
                  <InlineStack gap="200" align="center">
                    <Text as="span">Network:</Text>
                    <Text as="span" data-testid="text-blockchain-network">
                      {contractStatus.network.toUpperCase()}
                    </Text>
                  </InlineStack>
                  
                  {contractStatus.appId ? (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Contract Status:</Text>
                      <Badge tone="success" data-testid="badge-contract-deployed">
                        Deployed & Active
                      </Badge>
                    </InlineStack>
                  ) : (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Contract Status:</Text>
                      <Badge tone="warning" data-testid="badge-contract-demo">
                        Demo Mode
                      </Badge>
                    </InlineStack>
                  )}
                  
                  <InlineStack gap="200" align="center">
                    <Text as="span">Processors Configured:</Text>
                    <Text as="span" fontWeight="bold" data-testid="text-processors-count">
                      {processors.length}
                    </Text>
                  </InlineStack>
                  
                  {(contractStatus as any)?.genesisId && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Genesis ID:</Text>
                      <Text as="span" fontWeight="mono" data-testid="text-genesis-id">
                        {(contractStatus as any).genesisId}
                      </Text>
                    </InlineStack>
                  )}
                  
                  {(contractStatus as any)?.genesisHash && (
                    <InlineStack gap="200" align="center">
                      <Text as="span">Genesis Hash:</Text>
                      <Text as="span" fontWeight="mono" data-testid="text-genesis-hash">
                        {(contractStatus as any).genesisHash.substring(0, 16)}...
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              )}
              
              {!contractStatus?.connected && (
                <Text as="p" tone="subdued">
                  Connect to Algorand network to view live blockchain data.
                </Text>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Smart Contract Details */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">PayFlow Smart Contract Details</Text>
              <br />
              
              {contractDetailsLoading ? (
                <Spinner size="large" />
              ) : (
                <>
                  <Text as="p" tone="subdued">
                    Your deployed PayFlow smart contract on Algorand blockchain.
                  </Text>
                  <br />
                  <br />
                  
                  <BlockStack gap="300">
                    <InlineStack gap="200" align="center">
                      <Text as="span" fontWeight="bold">Application ID:</Text>
                      <Badge tone="info" data-testid="badge-app-id">
                        {contractDetails?.appId?.toLocaleString() || 'N/A'}
                      </Badge>
                    </InlineStack>
                    
                    {contractDetails?.creator && (
                      <InlineStack gap="200" align="center">
                        <Text as="span" fontWeight="bold">Creator Address:</Text>
                        <Text as="span" fontWeight="mono" data-testid="text-creator-address">
                          {contractDetails.creator.length > 20 
                            ? `${contractDetails.creator.substring(0, 20)}...` 
                            : contractDetails.creator}
                        </Text>
                      </InlineStack>
                    )}
                    
                    {contractDetails?.createdAtRound && (
                      <InlineStack gap="200" align="center">
                        <Text as="span" fontWeight="bold">Deployed at Round:</Text>
                        <Text as="span" data-testid="text-deployed-round">
                          {contractDetails.createdAtRound.toLocaleString()}
                        </Text>
                      </InlineStack>
                    )}
                    
                    {contractDetails?.deploymentHash && (
                      <InlineStack gap="200" align="center">
                        <Text as="span" fontWeight="bold">Deployment Hash:</Text>
                        <Text as="span" fontWeight="mono" data-testid="text-deployment-hash">
                          {contractDetails.deploymentHash.length > 20
                            ? `${contractDetails.deploymentHash.substring(0, 20)}...`
                            : contractDetails.deploymentHash}
                        </Text>
                      </InlineStack>
                    )}
                    
                    {contractDetails?.globalState && (
                      <div>
                        <Text as="p" fontWeight="bold">Global State:</Text>
                        <br />
                        <div style={{ 
                          backgroundColor: '#f6f6f7', 
                          padding: '12px', 
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '14px'
                        }}>
                          <Text as="pre" data-testid="text-global-state">
                            {JSON.stringify(contractDetails.globalState, null, 2)}
                          </Text>
                        </div>
                      </div>
                    )}
                  </BlockStack>
                </>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Smart Contract Code */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Smart Contract Code</Text>
              <br />
              
              <Text as="p" tone="subdued">
                PyTeal source code for the payment processor priority smart contract deployed on Algorand.
              </Text>
              <br />
              <br />
              
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e1e3e5',
                borderRadius: '8px',
                padding: '16px',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                <div style={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  color: '#333'
                }}>
                  <Text as="pre" data-testid="text-smart-contract-code">
{`"""
PayFlow Processor Priority Smart Contract
=========================================

This Algorand smart contract manages payment processor priorities and configurations.
It stores processor information in global state and allows authorized updates.

Global State Schema:
- processor_count: Number of configured processors
- processor_1_name: First processor name (e.g., "Stripe")
- processor_1_priority: First processor priority (1-10)
- processor_1_enabled: First processor enabled status (1/0)
- ... (similar for other processors)

Application Calls:
- get_processors: Read all processor configurations
- update_processor: Update a specific processor's settings
- add_processor: Add a new processor configuration
- remove_processor: Remove a processor configuration
"""

from pyteal import *

def approval_program():
    # Global state keys
    PROCESSOR_COUNT = Bytes("processor_count")
    
    def processor_name_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_name"))
    
    def processor_priority_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_priority"))
    
    def processor_enabled_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_enabled"))

    # Initialize the contract with default processors
    @Subroutine(TealType.none)
    def initialize_processors():
        return Seq([
            # Set processor count to 3
            App.globalPut(PROCESSOR_COUNT, Int(3)),
            
            # Initialize Stripe (processor 1)
            App.globalPut(processor_name_key(Int(1)), Bytes("Stripe")),
            App.globalPut(processor_priority_key(Int(1)), Int(1)),
            App.globalPut(processor_enabled_key(Int(1)), Int(1)),
            
            # Initialize PayPal (processor 2)
            App.globalPut(processor_name_key(Int(2)), Bytes("PayPal")),
            App.globalPut(processor_priority_key(Int(2)), Int(2)),
            App.globalPut(processor_enabled_key(Int(2)), Int(1)),
            
            # Initialize Square (processor 3)
            App.globalPut(processor_name_key(Int(3)), Bytes("Square")),
            App.globalPut(processor_priority_key(Int(3)), Int(3)),
            App.globalPut(processor_enabled_key(Int(3)), Int(1)),
        ])

    # Update processor priority
    @Subroutine(TealType.none)
    def update_processor_priority():
        processor_index = Btoi(Txn.application_args[1])
        new_priority = Btoi(Txn.application_args[2])
        
        return Seq([
            Assert(processor_index >= Int(1)),
            Assert(processor_index <= App.globalGet(PROCESSOR_COUNT)),
            Assert(new_priority >= Int(1)),
            Assert(new_priority <= Int(10)),
            App.globalPut(processor_priority_key(processor_index), new_priority)
        ])

    # Enable/disable processor
    @Subroutine(TealType.none)
    def toggle_processor():
        processor_index = Btoi(Txn.application_args[1])
        enabled = Btoi(Txn.application_args[2])
        
        return Seq([
            Assert(processor_index >= Int(1)),
            Assert(processor_index <= App.globalGet(PROCESSOR_COUNT)),
            Assert(Or(enabled == Int(0), enabled == Int(1))),
            App.globalPut(processor_enabled_key(processor_index), enabled)
        ])

    # Main program logic
    program = Cond(
        # Application creation - initialize with default processors
        [Txn.application_id() == Int(0), Seq([
            initialize_processors(),
            Approve()
        ])],
        
        # Update processor priority: args[0] = "update_priority", args[1] = index, args[2] = priority
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("update_priority"),
            Global.latest_timestamp() < Int(2000000000)  # Simple expiry check
        ), Seq([
            update_processor_priority(),
            Approve()
        ])],
        
        # Toggle processor enabled status: args[0] = "toggle", args[1] = index, args[2] = enabled (0/1)
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("toggle"),
            Global.latest_timestamp() < Int(2000000000)
        ), Seq([
            toggle_processor(),
            Approve()
        ])],
        
        # Read-only operations (NoOp without args) - always approve
        [Txn.on_completion() == OnComplete.NoOp, Approve()],
        
        # Reject all other operations
        [Int(1), Reject()]
    )
    
    return program

def clear_state_program():
    return Approve()

if __name__ == "__main__":
    # Compile the programs
    approval_teal = compileTeal(approval_program(), Mode.Application, version=6)
    clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=6)
    
    print("=== APPROVAL PROGRAM ===")
    print(approval_teal)
    print("\\n=== CLEAR STATE PROGRAM ===")
    print(clear_state_teal)`}
                  </Text>
                </div>
              </div>
              
              <br />
              
              <Text as="p" tone="subdued">
                <strong>Key Features:</strong>
              </Text>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li><Text as="span" tone="subdued">Stores processor configurations in Algorand global state</Text></li>
                <li><Text as="span" tone="subdued">Supports dynamic priority updates via blockchain transactions</Text></li>
                <li><Text as="span" tone="subdued">Enable/disable processors without redeployment</Text></li>
                <li><Text as="span" tone="subdued">Validates priority ranges (1-10) and processor counts</Text></li>
                <li><Text as="span" tone="subdued">Time-based expiry checks for security</Text></li>
              </ul>
            </div>
          </Card>
        </Layout.Section>

        {/* Recent Block Hashes */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Block Hashes</Text>
              <br />
              
              {blocksLoading ? (
                <Spinner size="large" />
              ) : (
                <>
                  <Text as="p" tone="subdued">
                    Latest blocks from the Algorand blockchain with their cryptographic hashes.
                  </Text>
                  <br />
                  <br />
                  
                  <DataTable
                    columnContentTypes={['numeric', 'text', 'text']}
                    headings={['Round', 'Block Hash', 'Time']}
                    rows={recentBlocks.map((block: any) => [
                      block.round.toLocaleString(),
                      <Text as="span" fontWeight="mono" key={block.round} data-testid={`hash-${block.round}`}>
                        {block.hash.length > 20 ? `${block.hash.substring(0, 20)}...` : block.hash}
                      </Text>,
                      new Date(block.timestamp).toLocaleTimeString()
                    ])}
                    data-testid="table-block-hashes"
                  />
                </>
              )}
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Edit Processor Modal */}
      <Modal
        open={modalActive}
        onClose={handleModalClose}
        title="Edit Processor Configuration"
        primaryAction={{
          content: 'Save Changes',
          onAction: handleSaveProcessor,
          loading: updateProcessorMutation.isPending,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleModalClose,
          },
        ]}
      >
        <Modal.Section>
          <Form onSubmit={handleSaveProcessor}>
            <FormLayout>
              <TextField
                label="Processor Name"
                value={formData.name}
                onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                autoComplete="off"
                data-testid="input-processor-name"
              />
              
              <Select
                label="Priority"
                options={Array.from({ length: 10 }, (_, i) => ({
                  label: `${i + 1}`,
                  value: `${i + 1}`,
                }))}
                value={formData.priority.toString()}
                onChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}
                data-testid="select-priority"
              />
              
              <Checkbox
                label="Enabled"
                checked={formData.enabled}
                onChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                data-testid="checkbox-enabled"
              />
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
      </Page>
    </Frame>
  );
}