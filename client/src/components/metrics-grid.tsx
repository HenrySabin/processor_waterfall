import type { SystemStats } from "@/lib/api";

interface MetricsGridProps {
  stats?: SystemStats;
}

export default function MetricsGrid({ stats }: MetricsGridProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const metrics = [
    {
      title: "Total Transactions",
      value: formatNumber(stats.totalTransactions),
      change: "+12.5% from last hour",
      icon: "fas fa-coins",
      color: "primary",
      testId: "metric-total-transactions",
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      change: "+0.3% from yesterday",
      icon: "fas fa-check-circle",
      color: "chart-2",
      testId: "metric-success-rate",
    },
    {
      title: "Avg Response Time",
      value: `${stats.avgResponseTime}ms`,
      change: "-15ms from last hour",
      icon: "fas fa-clock",
      color: "chart-4",
      testId: "metric-response-time",
    },
    {
      title: "Active Processors",
      value: `${stats.activeProcessors}/3`,
      change: "All systems operational",
      icon: "fas fa-server",
      color: "chart-2",
      testId: "metric-active-processors",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="metrics-grid">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-card p-6 rounded-lg shadow-sm border border-border metric-card" data-testid={metric.testId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground" data-testid={`${metric.testId}-title`}>{metric.title}</p>
              <p className="text-3xl font-bold text-foreground" data-testid={`${metric.testId}-value`}>{metric.value}</p>
              <p className="text-xs text-chart-1 mt-1" data-testid={`${metric.testId}-change`}>↗ {metric.change}</p>
            </div>
            <div className={`bg-${metric.color}/10 p-3 rounded-full`}>
              <i className={`${metric.icon} text-${metric.color} text-xl`} data-testid={`${metric.testId}-icon`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
