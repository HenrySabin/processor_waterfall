import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Frame, Navigation, TopBar, Loading, Card, Layout, Badge, Button, Text, Toast, Page } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import MetricsGrid from "@/components/metrics-grid";
import ProcessorStatus from "@/components/processor-status";
import RecentTransactions from "@/components/recent-transactions";
import SystemHealth from "@/components/system-health";
import QuickActions from "@/components/quick-actions";
import TransactionChart from "@/components/transaction-chart";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const queryClient = useQueryClient();

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
                <Text variant="headingMd" as="h2">Transaction Volume (Last 12h)</Text>
                <div style={{ marginTop: '16px', height: '200px' }}>
                  <TransactionChart transactions={metrics?.recentTransactions || []} />
                </div>
              </div>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <ProcessorStatus processors={metrics?.processors || []} />
          </Layout.Section>
          
          <Layout.Section>
            <RecentTransactions />
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