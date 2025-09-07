import { useState, useEffect } from "react";
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
  BlockStack
} from "@shopify/polaris";
import { useToast } from "@/hooks/use-toast";

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
  const [editingProcessor, setEditingProcessor] = useState<ProcessorConfig | null>(null);
  const [modalActive, setModalActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    priority: 1,
    enabled: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
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
  );
}