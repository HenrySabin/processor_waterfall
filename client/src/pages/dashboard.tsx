import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import MetricsGrid from "@/components/metrics-grid";
import ProcessorStatus from "@/components/processor-status";
import RecentTransactions from "@/components/recent-transactions";
import SystemHealth from "@/components/system-health";
import QuickActions from "@/components/quick-actions";
import TransactionChart from "@/components/transaction-chart";

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: health } = useQuery({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Header health={health} />
        <div className="p-6">
          <MetricsGrid stats={metrics?.stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Transaction Volume (Last 12h)</h3>
              <TransactionChart transactions={metrics?.recentTransactions} />
            </div>
            
            <ProcessorStatus processors={metrics?.processors} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecentTransactions transactions={metrics?.recentTransactions} />
            <SystemHealth health={health} />
          </div>

          <QuickActions />
        </div>
      </div>
    </div>
  );
}
