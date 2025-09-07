import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function QuickActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const testPaymentMutation = useMutation({
    mutationFn: () => api.processPayment({
      amount: "10.00",
      currency: "USD",
      metadata: { test: true, source: "dashboard" }
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health'] });
      toast({
        title: "Test Payment Complete",
        description: `Payment ${data.success ? 'succeeded' : 'failed'} with transaction ID: ${data.transactionId}`,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Test Payment Failed",
        description: "Failed to process test payment.",
        variant: "destructive",
      });
    },
  });

  const demoSimulationMutation = useMutation({
    mutationFn: api.simulatePaymentLoad,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health'] });
      toast({
        title: "🚀 Demo Simulation Complete!",
        description: `Processed ${data.summary.totalPayments} payments with ${data.summary.successRate}% success rate. Perfect for your demo presentation!`,
        duration: 6000,
      });
    },
    onError: () => {
      toast({
        title: "Demo Simulation Failed",
        description: "Failed to run payment load simulation.",
        variant: "destructive",
      });
    },
  });

  const exportLogsMutation = useMutation({
    mutationFn: api.getLogs,
    onSuccess: (data) => {
      // Create and download CSV of logs
      const csv = [
        ['Timestamp', 'Level', 'Service', 'Message', 'Transaction ID', 'Processor ID'].join(','),
        ...data.logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.level,
          log.service,
          `"${log.message}"`,
          log.transactionId || '',
          log.processorId || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payflow-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: `Exported ${data.logs.length} log entries to CSV.`,
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export system logs.",
        variant: "destructive",
      });
    },
  });

  const actions = [
    {
      title: "🚀 Demo Mode",
      description: "Simulate 25 payments for demo presentation",
      icon: "fas fa-rocket",
      action: () => demoSimulationMutation.mutate(),
      loading: demoSimulationMutation.isPending,
      testId: "button-demo-simulation",
      featured: true,
    },
    {
      title: "Test Payment",
      description: "Run test transaction",
      icon: "fas fa-vial",
      action: () => testPaymentMutation.mutate(),
      loading: testPaymentMutation.isPending,
      testId: "button-test-payment",
    },
    {
      title: "Export Logs",
      description: "Download system logs",
      icon: "fas fa-download",
      action: () => exportLogsMutation.mutate(),
      loading: exportLogsMutation.isPending,
      testId: "button-export-logs",
    },
    {
      title: "Update Config",
      description: "Modify processor settings",
      icon: "fas fa-sliders-h",
      action: () => {
        toast({
          title: "Configuration",
          description: "Configuration panel will be implemented in future versions.",
        });
      },
      loading: false,
      testId: "button-update-config",
    },
  ];

  return (
    <div className="mt-8 bg-card p-6 rounded-lg shadow-sm border border-border" data-testid="quick-actions">
      <h3 className="text-lg font-semibold text-foreground mb-4" data-testid="quick-actions-title">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Button
            key={action.title}
            variant="ghost"
            className={`flex items-center p-4 rounded-lg h-auto justify-start transition-all duration-200 ${
              action.featured 
                ? 'bg-gradient-to-r from-primary/20 to-chart-2/20 border-2 border-primary/30 hover:from-primary/30 hover:to-chart-2/30 shadow-lg' 
                : 'bg-accent hover:bg-accent/80'
            }`}
            onClick={action.action}
            disabled={action.loading}
            data-testid={action.testId}
          >
            <i className={`${action.icon} text-xl mr-3 ${
              action.featured ? 'text-primary animate-pulse' : 'text-primary'
            } ${action.loading ? 'animate-spin' : ''}`}></i>
            <div className="text-left">
              <p className={`font-medium ${action.featured ? 'text-primary font-bold' : 'text-foreground'}`}>
                {action.title}
              </p>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
