import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Frame, Navigation, TopBar, Loading, Card, Layout, Badge, Button, Text, Toast, Page } from "@shopify/polaris";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import MetricsGrid from "@/components/metrics-grid";
import ProcessorStatus from "@/components/processor-status";
import RecentTransactions from "@/components/recent-transactions";
import SystemHealth from "@/components/system-health";
import QuickActions from "@/components/quick-actions";
import RechartsTransactionChart from "@/components/recharts-transaction-chart";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState({ current: 0, total: 100 });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/metrics'],
    refetchInterval: 30000,
  });

  const { data: health } = useQuery({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/health'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/processors'] }),
      ]);
    },
    onSuccess: () => {
      setToastMessage('Dashboard refreshed successfully!');
      setToastActive(true);
    },
    onError: () => {
      setToastMessage('Failed to refresh dashboard data');
      setToastActive(true);
    },
  });

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((mobileNavigationActive) => !mobileNavigationActive),
    [],
  );

  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);

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
      const amount = (Math.random() * 800 + 15).toFixed(2);
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
        setDemoProgress({ current: i + 1, total: 100 });
        
        try {
          const result = await api.processPayment(payment);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          toast({
            title: `Payment ${i + 1}/100`,
            description: `${payment.metadata.customer} - $${payment.amount} (${result.success ? 'Success' : 'Failed'})`,
            variant: result.success ? "default" : "destructive",
          });
        } catch (error) {
          failCount++;
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/health'] });
        
        if (i < demoPayments.length - 1) {
          const delay = Math.random() * 100 + 50;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      const successRate = Math.round((successCount / demoPayments.length) * 100);
      toast({
        title: "Demo Complete! 🎉",
        description: `Processed 100 payments with ${successRate}% success rate (${successCount} successful, ${failCount} failed)`,
      });
    } catch (error) {
      toast({
        title: "Demo Failed",
        description: "An error occurred during the demo.",
        variant: "destructive",
      });
    } finally {
      setDemoRunning(false);
      setDemoProgress({ current: 0, total: 100 });
    }
  };

  if (isLoading) {
    return (
      <Frame>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Loading />
        </div>
      </Frame>
    );
  }

  const getSystemStatus = () => {
    if (!health) return { text: "Loading...", tone: "warning" };
    
    const hasUnhealthyProcessor = health.processors?.some((p: any) => p.circuitBreakerOpen);
    if (hasUnhealthyProcessor) {
      return { text: "System Warning", tone: "warning" };
    }
    
    return { text: "System Healthy", tone: "success" };
  };

  const systemStatus = getSystemStatus();

  const navigationMarkup = (
    <Navigation location={location}>
      <Navigation.Section
        items={[
          {
            url: '/dashboard',
            label: 'Dashboard', 
            selected: location === '/' || location === '/dashboard',
            onClick: () => setLocation('/dashboard'),
          },
          {
            url: '/processors',
            label: 'Processors',
            selected: location === '/processors', 
            onClick: () => setLocation('/processors'),
          },
          {
            url: '/transactions',
            label: 'Transactions',
            selected: location === '/transactions',
            onClick: () => setLocation('/transactions'),
          },
          {
            url: '/health',
            label: 'Health',
            selected: location === '/health',
            onClick: () => setLocation('/health'),
          },
          {
            url: '/config',
            label: 'Configuration',
            selected: location === '/config',
            onClick: () => setLocation('/config'),
          },
        ]}
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
      secondaryMenu={
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge tone={systemStatus.tone as any}>{systemStatus.text}</Badge>
          <Button
            onClick={() => refreshMutation.mutate()}
            loading={refreshMutation.isPending}
            size="slim"
          >
            Refresh
          </Button>
          <Button
            onClick={() => runStaggeredDemo()}
            loading={demoRunning}
            size="slim"
            primary
          >
            {demoRunning ? `Demo (${demoProgress.current}/${demoProgress.total})` : '🚀 Simulate Surge'}
          </Button>
        </div>
      }
    />
  );

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={toggleToastActive} />
  ) : null;

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      <Page title="Payment Dashboard" subtitle="Monitor your payment processor waterfall system">
        <Layout>
          <Layout.Section>
            <MetricsGrid stats={metrics?.stats || {}} />
          </Layout.Section>
          
          <Layout.Section>
            <Card>
              <div style={{ padding: '16px' }}>
                <Text variant="headingMd" as="h2">Transaction Volume</Text>
                <div style={{ marginTop: '16px', height: '200px' }}>
                  <RechartsTransactionChart transactions={metrics?.recentTransactions || []} />
                </div>
              </div>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <RecentTransactions />
          </Layout.Section>
          
          <Layout.Section>
            <ProcessorStatus processors={metrics?.processors || []} />
          </Layout.Section>
          
          <Layout.Section>
            <SystemHealth health={health as any} />
          </Layout.Section>
          
          <Layout.Section>
            <QuickActions />
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  );
}