import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HealthCheck } from "@/lib/api";

interface HeaderProps {
  health?: HealthCheck;
}

export default function Header({ health }: HeaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/health'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/processors'] }),
      ]);
    },
    onSuccess: () => {
      toast({
        title: "Dashboard Refreshed",
        description: "All data has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh dashboard data.",
        variant: "destructive",
      });
    },
  });

  const getSystemStatus = () => {
    if (!health) return { text: "Loading...", color: "status-warning" };
    
    const hasUnhealthyProcessor = health.processors.some(p => p.circuitBreakerOpen);
    if (hasUnhealthyProcessor) {
      return { text: "System Warning", color: "status-warning" };
    }
    
    return { text: "System Healthy", color: "status-healthy" };
  };

  const systemStatus = getSystemStatus();

  return (
    <header className="bg-card shadow-sm border-b border-border p-6" data-testid="header">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Payment Dashboard</h2>
          <p className="text-muted-foreground" data-testid="page-subtitle">Monitor your payment processor waterfall system</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-accent px-3 py-2 rounded-lg" data-testid="system-status">
            <span className={`status-indicator ${systemStatus.color}`}></span>
            <span className="text-sm font-medium" data-testid="status-text">{systemStatus.text}</span>
          </div>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-refresh"
          >
            <i className={`fas fa-sync-alt mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`}></i>
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
    </header>
  );
}
