import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HealthCheck } from "@/lib/api";

interface SystemHealthProps {
  health?: HealthCheck;
}

export default function SystemHealth({ health }: SystemHealthProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const healthCheckMutation = useMutation({
    mutationFn: api.runHealthCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      toast({
        title: "Health Check Complete",
        description: "System health check completed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Health Check Failed",
        description: "Failed to run system health check.",
        variant: "destructive",
      });
    },
  });

  const getHealthStatus = (status: string) => {
    switch (status?.toLowerCase?.() || '') {
      case 'healthy':
      case 'connected':
      case 'active':
      case 'normal':
        return { color: 'status-healthy', text: status };
      case 'warning':
      case '1 open':
        return { color: 'status-warning', text: status };
      case 'error':
      case 'disconnected':
        return { color: 'status-error', text: status };
      default:
        return { color: 'status-disabled', text: status };
    }
  };

  if (!health) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">System Health</h3>
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
              <div className="h-4 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const healthItems = [
    { name: 'API Health', status: health.system?.api || health.status || 'Unknown' },
    { name: 'Database', status: health.system?.database || 'Unknown' },
    { 
      name: 'Circuit Breaker', 
      status: health.processors?.some(p => p.circuitBreakerOpen) ? '1 Open' : 'Normal'
    },
    { name: 'Rate Limiting', status: 'Normal' },
  ];

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border" data-testid="system-health">
      <h3 className="text-lg font-semibold text-foreground mb-4" data-testid="system-health-title">System Health</h3>
      
      <div className="space-y-4">
        {healthItems.map((item) => {
          const status = getHealthStatus(item.status);
          return (
            <div key={item.name} className="flex items-center justify-between" data-testid={`health-item-${item.name.toLowerCase().replace(' ', '-')}`}>
              <div className="flex items-center">
                <span className={`status-indicator ${status.color}`} data-testid={`health-indicator-${item.name.toLowerCase().replace(' ', '-')}`}></span>
                <span className="text-sm text-foreground" data-testid={`health-name-${item.name.toLowerCase().replace(' ', '-')}`}>{item.name}</span>
              </div>
              <span className="text-sm font-medium text-chart-2" data-testid={`health-status-${item.name.toLowerCase().replace(' ', '-')}`}>
                {status.text}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-foreground mb-3" data-testid="smart-contract-title">Smart Contract Status</h4>
        <div className="flex items-center justify-between" data-testid="algorand-network-status">
          <div className="flex items-center">
            <span className={`status-indicator ${health.smartContract?.connected || health.algorand?.connected ? 'status-healthy' : 'status-error'}`}></span>
            <span className="text-sm text-foreground">Algorand Network</span>
          </div>
          <span className="text-sm font-medium text-chart-2">
            {health.smartContract?.connected || health.algorand?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2" data-testid="contract-client-status">
          <div className="flex items-center">
            <span className="status-indicator status-healthy"></span>
            <span className="text-sm text-foreground">Contract Client</span>
          </div>
          <span className="text-sm font-medium text-chart-2">Active</span>
        </div>
      </div>

      <div className="mt-6">
        <Button
          onClick={() => healthCheckMutation.mutate()}
          disabled={healthCheckMutation.isPending}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-run-health-check"
        >
          <i className={`fas fa-stethoscope mr-2 ${healthCheckMutation.isPending ? 'animate-spin' : ''}`}></i>
          {healthCheckMutation.isPending ? 'Running Check...' : 'Run Health Check'}
        </Button>
      </div>
    </div>
  );
}
