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
  const [showAll, setShowAll] = useState(false);
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
            <Text variant="bodyMd" as="p" tone="subdued">Loading processor status...</Text>
          </div>
        </div>
      </Card>
    );
  }

  const displayedProcessors = showAll ? processors : processors.slice(0, 10);
  
  const rows = displayedProcessors.map((processor) => [
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
    <Text variant="bodyMd" as="span" key={`priority-${processor.id}`}>
      {processor.priority}
    </Text>,
    <Text variant="bodyMd" as="span" key={`success-${processor.id}`}>
      {processor.successRate}%
    </Text>,
    <div key={`toggle-${processor.id}`} style={{ display: 'flex', alignItems: 'center' }}>
      <label style={{ 
        position: 'relative', 
        display: 'inline-block', 
        width: '44px', 
        height: '24px',
        cursor: toggleMutation.isPending ? 'not-allowed' : 'pointer'
      }}>
        <input 
          type="checkbox"
          checked={processor.enabled}
          onChange={() => !toggleMutation.isPending && toggleMutation.mutate(processor.id)}
          disabled={toggleMutation.isPending}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: processor.enabled ? '#00b894' : '#ddd',
          borderRadius: '24px',
          transition: 'background-color 0.3s',
          opacity: toggleMutation.isPending ? 0.5 : 1
        }}>
          <span style={{
            position: 'absolute',
            content: '',
            height: '18px',
            width: '18px',
            left: processor.enabled ? '23px' : '3px',
            bottom: '3px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'left 0.3s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} />
        </span>
      </label>
    </div>,
  ]);

  const headings = [
    'Processor',
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
          <div style={{ marginBottom: '16px' }}>
            <Text variant="headingMd" as="h3">Processor Status</Text>
          </div>
          
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text']}
            headings={headings}
            rows={rows}
            footerContent={
              <Text variant="bodySm" as="p" tone="subdued">
                Showing {displayedProcessors.length} of {processors.length} payment processors
              </Text>
            }
          />
          
          {processors.length > 10 && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button 
                size="slim" 
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show More (${processors.length - 10} hidden)`}
              </Button>
            </div>
          )}
        </div>
      </Card>
      {toastMarkup}
    </>
  );
}