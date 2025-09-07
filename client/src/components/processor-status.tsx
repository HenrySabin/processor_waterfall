import { Card, Text, Badge, Button, DataTable, ButtonGroup, Toast } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProcessorStatus as ProcessorStatusType } from "@/lib/api";

interface ProcessorStatusProps {
  processors?: ProcessorStatusType[];
}

export default function ProcessorStatus({ processors }: ProcessorStatusProps) {
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const queryClient = useQueryClient();

  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);

  const toggleMutation = useMutation({
    mutationFn: api.toggleProcessor,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/processors'] });
      setToastMessage(data.message);
      setToastActive(true);
    },
    onError: () => {
      setToastMessage('Failed to toggle processor status.');
      setToastActive(true);
    },
  });

  const getStatusTone = (processor: ProcessorStatusType) => {
    if (!processor.enabled) return "subdued";
    if (processor.circuitBreakerOpen) return "critical";
    if (processor.consecutiveFailures > 0) return "warning";
    return "success";
  };

  const getStatusText = (processor: ProcessorStatusType) => {
    if (!processor.enabled) return "Disabled";
    if (processor.circuitBreakerOpen) return "Circuit Open";
    if (processor.consecutiveFailures > 0) return "Warning";
    return "Active";
  };

  if (!processors) {
    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <Text variant="headingMd" as="h3">Processor Status</Text>
          <div style={{ marginTop: '16px' }}>
            <Text variant="bodyMd" tone="subdued">Loading processor status...</Text>
          </div>
        </div>
      </Card>
    );
  }

  const rows = processors.map((processor) => [
    <div key={`name-${processor.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 
            !processor.enabled ? '#9CA3AF' :
            processor.circuitBreakerOpen ? '#EF4444' :
            processor.consecutiveFailures > 0 ? '#F59E0B' : '#10B981'
        }}
      />
      <Text variant="bodyMd" as="span" fontWeight="semibold">{processor.name}</Text>
    </div>,
    <Badge tone={getStatusTone(processor) as any} key={`status-${processor.id}`}>
      {getStatusText(processor)}
    </Badge>,
    <Text variant="bodyMd" as="span" key={`priority-${processor.id}`}>
      {processor.priority}
    </Text>,
    <Text variant="bodyMd" as="span" key={`success-${processor.id}`}>
      {processor.successRate}%
    </Text>,
    <Button
      key={`toggle-${processor.id}`}
      size="slim"
      onClick={() => toggleMutation.mutate(processor.id)}
      loading={toggleMutation.isPending}
      tone="critical"
    >
      Toggle
    </Button>,
  ]);

  const headings = [
    'Processor',
    'Status',
    'Priority',
    'Success Rate',
    'Actions',
  ];

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={toggleToastActive} />
  ) : null;

  return (
    <>
      <Card>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Text variant="headingMd" as="h3">Processor Status</Text>
            <Button size="slim" tone="subdued">
              View All
            </Button>
          </div>
          
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'text']}
            headings={headings}
            rows={rows}
            footerContent={
              <Text variant="bodySm" tone="subdued">
                Showing {processors.length} payment processors
              </Text>
            }
          />
        </div>
      </Card>
      {toastMarkup}
    </>
  );
}