import { Card, Text, Badge, Button, DataTable, ButtonGroup, Toast } from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
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
  const [recentlyUsedProcessors, setRecentlyUsedProcessors] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);

  // WebSocket connection to track real-time processor usage
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Track processor usage from transaction messages
        if (data.type === 'transaction' && data.data?.processorId) {
          const processorId = data.data.processorId;
          
          // Mark processor as recently used
          setRecentlyUsedProcessors(prev => new Set(Array.from(prev).concat(processorId)));
          
          // Remove from recently used after 3 seconds
          setTimeout(() => {
            setRecentlyUsedProcessors(prev => {
              const newSet = new Set(Array.from(prev));
              newSet.delete(processorId);
              return newSet;
            });
          }, 3000);
        }

        // Also track from metrics updates when processors are actively processing
        if (data.type === 'metrics' && data.data?.recentTransactions) {
          data.data.recentTransactions.forEach((tx: any) => {
            if (tx.processorId && tx.status === 'success') {
              const processorId = tx.processorId;
              
              setRecentlyUsedProcessors(prev => new Set(Array.from(prev).concat(processorId)));
              
              setTimeout(() => {
                setRecentlyUsedProcessors(prev => {
                  const newSet = new Set(Array.from(prev));
                  newSet.delete(processorId);
                  return newSet;
                });
              }, 3000);
            }
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    return () => {
      socket.close();
    };
  }, []);

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
  
  const rows = displayedProcessors.map((processor) => {
    const isRecentlyUsed = recentlyUsedProcessors.has(processor.id);
    
    return [
      <div key={`name-${processor.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {/* Outer glow ring for recently used processors */}
          {isRecentlyUsed && (
            <div 
              style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                opacity: 0.3,
                animation: 'pulse-glow 2s infinite',
                zIndex: 0
              }}
            />
          )}
          
          {/* Main status indicator */}
          <div 
            style={{
              width: isRecentlyUsed ? '10px' : '8px',
              height: isRecentlyUsed ? '10px' : '8px',
              borderRadius: '50%',
              backgroundColor: 
                !processor.enabled ? '#9CA3AF' :
                processor.circuitBreakerOpen ? '#EF4444' :
                processor.consecutiveFailures > 0 ? '#F59E0B' : '#10B981',
              boxShadow: isRecentlyUsed ? '0 0 8px #10B981' : 'none',
              transition: 'all 0.3s ease',
              zIndex: 1,
              position: 'relative'
            }}
          />
        </div>
        <Text variant="bodyMd" as="span" fontWeight="semibold">{processor.name}</Text>
        {isRecentlyUsed && (
          <Text variant="bodySm" as="span" tone="success" fontWeight="medium">
            • PROCESSING
          </Text>
        )}
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
    ];
  });

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
      <style>{`
        @keyframes pulse-glow {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.1;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }
      `}</style>
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