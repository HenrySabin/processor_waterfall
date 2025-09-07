import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export default function QuickActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState({ current: 0, total: 25 });

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

  const runStaggeredDemo = async () => {
    if (demoRunning) return;
    
    setDemoRunning(true);
    setDemoProgress({ current: 0, total: 25 });
    
    const demoPayments = [
      // Initial slow rollout (longer delays)
      { amount: "25.99", currency: "USD", metadata: { demo: true, customer: "Alice Johnson", product: "Premium Plan" } },
      { amount: "149.99", currency: "USD", metadata: { demo: true, customer: "Bob Smith", product: "Enterprise License" } },
      { amount: "89.50", currency: "USD", metadata: { demo: true, customer: "Carol Davis", product: "Monthly Subscription" } },
      { amount: "12.00", currency: "USD", metadata: { demo: true, customer: "David Wilson", product: "Basic Plan" } },
      { amount: "299.99", currency: "USD", metadata: { demo: true, customer: "Eva Brown", product: "Yearly Premium" } },
      
      // Building momentum (medium delays)
      { amount: "67.49", currency: "USD", metadata: { demo: true, customer: "Frank Miller", product: "Pro Tools" } },
      { amount: "34.99", currency: "USD", metadata: { demo: true, customer: "Grace Lee", product: "Monthly Pro" } },
      { amount: "156.00", currency: "USD", metadata: { demo: true, customer: "Henry Chang", product: "Team License" } },
      { amount: "78.25", currency: "USD", metadata: { demo: true, customer: "Ivy Martinez", product: "Standard Plan" } },
      { amount: "199.99", currency: "USD", metadata: { demo: true, customer: "Jack Thompson", product: "Annual Pro" } },
      
      // High-traffic spike (short delays)
      { amount: "499.99", currency: "USD", metadata: { demo: true, customer: "Kelly Anderson", product: "Enterprise Suite" } },
      { amount: "999.00", currency: "USD", metadata: { demo: true, customer: "Liam Rodriguez", product: "Corporate License" } },
      { amount: "45.99", currency: "USD", metadata: { demo: true, customer: "Maya Patel", product: "Starter Pack" } },
      { amount: "125.50", currency: "USD", metadata: { demo: true, customer: "Nathan Kim", product: "Developer Tools" } },
      { amount: "379.99", currency: "USD", metadata: { demo: true, customer: "Olivia Green", product: "Team Premium" } },
      { amount: "22.49", currency: "USD", metadata: { demo: true, customer: "Paul Walker", product: "Basic Tools" } },
      { amount: "188.75", currency: "USD", metadata: { demo: true, customer: "Quinn Taylor", product: "Pro Suite" } },
      { amount: "56.99", currency: "USD", metadata: { demo: true, customer: "Rachel White", product: "Monthly Basic" } },
      { amount: "245.00", currency: "USD", metadata: { demo: true, customer: "Sam Johnson", product: "Quarterly Pro" } },
      { amount: "99.99", currency: "USD", metadata: { demo: true, customer: "Tina Liu", product: "Standard Pro" } },
      
      // Final burst (very short delays)
      { amount: "167.49", currency: "USD", metadata: { demo: true, customer: "Uma Shah", product: "Team Standard" } },
      { amount: "89.99", currency: "USD", metadata: { demo: true, customer: "Victor Chen", product: "Monthly Plus" } },
      { amount: "299.49", currency: "USD", metadata: { demo: true, customer: "Wendy Brooks", product: "Annual Team" } },
      { amount: "139.99", currency: "USD", metadata: { demo: true, customer: "Xavier Jones", product: "Pro Monthly" } },
      { amount: "459.99", currency: "USD", metadata: { demo: true, customer: "Yuki Tanaka", product: "Enterprise Pro" } }
    ];

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < demoPayments.length; i++) {
        const payment = demoPayments[i];
        
        try {
          await api.processPayment(payment);
          successCount++;
          
          // Show real-time progress toast
          toast({
            title: `💳 Payment ${i + 1}/${demoPayments.length}`,
            description: `${payment.metadata?.customer} - $${payment.amount}`,
            duration: 1000,
          });
          
        } catch (error) {
          failCount++;
        }
        
        // Update progress
        setDemoProgress({ current: i + 1, total: demoPayments.length });
        
        // Refresh metrics after each payment for real-time updates
        queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/health'] });
        
        // Dynamic delays - creating realistic traffic patterns
        if (i < demoPayments.length - 1) {
          let delay;
          if (i < 5) {
            // Slow start: 800-1200ms delays (1-2 per second)
            delay = Math.random() * 400 + 800;
          } else if (i < 10) {
            // Building up: 400-600ms delays (2-3 per second)
            delay = Math.random() * 200 + 400;
          } else if (i < 20) {
            // High traffic spike: 100-250ms delays (4-8 per second)
            delay = Math.random() * 150 + 100;
          } else {
            // Final burst: 50-150ms delays (8-15 per second)
            delay = Math.random() * 100 + 50;
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Final completion toast
      const successRate = Math.round((successCount / demoPayments.length) * 100);
      toast({
        title: "🚀 Demo Complete!",
        description: `Processed ${demoPayments.length} payments with ${successRate}% success rate. Perfect for your demo presentation!`,
        duration: 6000,
      });
      
    } catch (error) {
      toast({
        title: "Demo Failed",
        description: "An error occurred during the demo simulation.",
        variant: "destructive",
      });
    } finally {
      setDemoRunning(false);
      setDemoProgress({ current: 0, total: 25 });
    }
  };

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
      title: demoRunning ? `🚀 Demo Running (${demoProgress.current}/${demoProgress.total})` : "🚀 Demo Mode",
      description: demoRunning ? "Transactions streaming in real-time..." : "Simulate 25 staggered payments",
      icon: "fas fa-rocket",
      action: () => runStaggeredDemo(),
      loading: demoRunning,
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
