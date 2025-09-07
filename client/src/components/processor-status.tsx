import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProcessorStatus as ProcessorStatusType } from "@/lib/api";

interface ProcessorStatusProps {
  processors?: ProcessorStatusType[];
}

export default function ProcessorStatus({ processors }: ProcessorStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: api.toggleProcessor,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/processors'] });
      toast({
        title: "Processor Updated",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Toggle Failed",
        description: "Failed to toggle processor status.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (processor: ProcessorStatusType) => {
    if (!processor.enabled) return "status-disabled";
    if (processor.circuitBreakerOpen) return "status-error";
    if (processor.consecutiveFailures > 0) return "status-warning";
    return "status-healthy";
  };

  const getStatusText = (processor: ProcessorStatusType) => {
    if (!processor.enabled) return "Disabled";
    if (processor.circuitBreakerOpen) return "Circuit Open";
    if (processor.consecutiveFailures > 0) return "Warning";
    return "Active";
  };

  const getStatusBadgeColor = (processor: ProcessorStatusType) => {
    if (!processor.enabled) return "bg-muted text-muted-foreground";
    if (processor.circuitBreakerOpen) return "bg-destructive text-destructive-foreground";
    if (processor.consecutiveFailures > 0) return "bg-chart-4 text-white";
    return "bg-chart-2 text-white";
  };

  if (!processors) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Processor Status</h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-accent rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <div>
                  <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
              </div>
              <div className="w-16 h-6 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border" data-testid="processor-status">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground" data-testid="processor-status-title">Processor Status</h3>
        <button className="text-primary hover:text-primary/80 text-sm" data-testid="link-view-all">
          <i className="fas fa-external-link-alt mr-1"></i>
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {processors.map((processor) => (
          <div key={processor.id} className="flex items-center justify-between p-4 bg-accent rounded-lg" data-testid={`processor-${processor.name.toLowerCase()}`}>
            <div className="flex items-center">
              <span className={`status-indicator ${getStatusColor(processor)}`} data-testid={`status-indicator-${processor.name.toLowerCase()}`}></span>
              <div>
                <p className="font-medium text-foreground" data-testid={`processor-name-${processor.name.toLowerCase()}`}>{processor.name}</p>
                <p className="text-sm text-muted-foreground" data-testid={`processor-details-${processor.name.toLowerCase()}`}>
                  Priority: {processor.priority} | Success: {processor.successRate}%
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(processor)}`} data-testid={`status-badge-${processor.name.toLowerCase()}`}>
                {getStatusText(processor)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMutation.mutate(processor.id)}
                disabled={toggleMutation.isPending}
                className="text-muted-foreground hover:text-foreground"
                data-testid={`button-toggle-${processor.name.toLowerCase()}`}
              >
                <i className="fas fa-cog"></i>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
