import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export default function QuickActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState({ current: 0, total: 100 });

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
    setDemoProgress({ current: 0, total: 100 });
    
    // Generate 100 realistic demo payments
    const customers = [
      "Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson", "Eva Brown",
      "Frank Miller", "Grace Lee", "Henry Chang", "Ivy Martinez", "Jack Thompson",
      "Kelly Anderson", "Liam Rodriguez", "Maya Patel", "Nathan Kim", "Olivia Green",
      "Paul Walker", "Quinn Taylor", "Rachel White", "Sam Johnson", "Tina Liu",
      "Uma Shah", "Victor Chen", "Wendy Brooks", "Xavier Jones", "Yuki Tanaka",
      "Alex Turner", "Beth Cooper", "Chris Evans", "Diana Prince", "Eric Stone",
      "Fiona Clark", "Gary Adams", "Hannah Lee", "Ian Foster", "Julia Martinez",
      "Kevin Brown", "Laura Wilson", "Mike Davis", "Nina Garcia", "Oscar Kim",
      "Penny Wright", "Quinn Miller", "Ryan Jones", "Sarah Chen", "Tony Park",
      "Uma Patel", "Vince Taylor", "Wendy Adams", "Xander Liu", "Yvonne King",
      "Zoe Thompson", "Aaron White", "Bella Rodriguez", "Carlos Martinez", "Delilah Johnson",
      "Ethan Cooper", "Felicia Brown", "Gabriel Kim", "Holly Davis", "Ivan Garcia",
      "Jasmine Lee", "Kyle Wilson", "Lucy Chen", "Marcus Jones", "Nora Smith",
      "Oliver Park", "Priya Patel", "Quincy Adams", "Ruby Martinez", "Sean Taylor",
      "Tara Johnson", "Ulysses Brown", "Violet Kim", "Wade Davis", "Xara Garcia",
      "Yale Lee", "Zara Wilson", "Adam Chen", "Bryce Jones", "Chloe Smith",
      "Drake Park", "Elena Patel", "Felix Adams", "Gina Martinez", "Hugo Taylor",
      "Iris Johnson", "Jake Brown", "Kara Kim", "Luke Davis", "Maya Garcia",
      "Noah Lee", "Olive Wilson", "Pete Chen", "Quinn Jones", "Rita Smith",
      "Shane Park", "Tess Patel", "Uri Adams", "Vera Martinez", "Will Taylor",
      "Xia Johnson", "Yale Brown", "Zoe Kim", "Amy Davis", "Ben Garcia"
    ];
    
    const products = [
      "Premium Plan", "Enterprise License", "Monthly Subscription", "Basic Plan", "Yearly Premium",
      "Pro Tools", "Monthly Pro", "Team License", "Standard Plan", "Annual Pro",
      "Enterprise Suite", "Corporate License", "Starter Pack", "Developer Tools", "Team Premium",
      "Basic Tools", "Pro Suite", "Monthly Basic", "Quarterly Pro", "Standard Pro",
      "Team Standard", "Monthly Plus", "Annual Team", "Pro Monthly", "Enterprise Pro",
      "Starter Tools", "Premium Suite", "Team Basic", "Corporate Pro", "Monthly Standard"
    ];
    
    const demoPayments = [];
    for (let i = 0; i < 100; i++) {
      const amount = (Math.random() * 800 + 15).toFixed(2); // Random amounts $15-$815
      const customer = customers[i % customers.length];
      const product = products[i % products.length];
      
      demoPayments.push({
        amount,
        currency: "USD",
        metadata: { demo: true, customer, product }
      });
    }

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
        
        // High-speed processing: 100 payments over 10 seconds (average 100ms delays)
        if (i < demoPayments.length - 1) {
          // Random delay between 50-150ms to create realistic variation while maintaining ~10/second
          const delay = Math.random() * 100 + 50;
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
      setDemoProgress({ current: 0, total: 100 });
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
      description: demoRunning ? "High-volume transactions streaming..." : "Simulate 100 payments in 10 seconds",
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
