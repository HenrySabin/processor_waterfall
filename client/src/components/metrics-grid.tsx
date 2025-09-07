import { Card, Text, SkeletonDisplayText, SkeletonBodyText } from "@shopify/polaris";
import type { SystemStats } from "@/lib/api";

interface MetricsGridProps {
  stats?: SystemStats;
}

export default function MetricsGrid({ stats }: MetricsGridProps) {
  if (!stats) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px' 
      }}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <div style={{ padding: '16px' }}>
              <SkeletonBodyText lines={1} />
              <div style={{ marginTop: '8px' }}>
                <SkeletonDisplayText size="large" />
              </div>
              <div style={{ marginTop: '8px' }}>
                <SkeletonBodyText lines={1} />
              </div>
            </div>
          </Card>
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
      color: "#2563eb",
      testId: "metric-total-transactions",
    },
    {
      title: "Success Rate", 
      value: `${stats.successRate}%`,
      change: "+0.3% from yesterday",
      color: "#16a34a",
      testId: "metric-success-rate",
    },
    {
      title: "Avg Response Time",
      value: `${stats.avgResponseTime}ms`,
      change: "-15ms from last hour",
      color: "#ea580c",
      testId: "metric-response-time",
    },
    {
      title: "Active Processors",
      value: `${stats.activeProcessors}/3`,
      change: "All systems operational",
      color: "#16a34a",
      testId: "metric-active-processors",
    },
  ];

  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px' 
      }}
      data-testid="metrics-grid"
    >
      {metrics.map((metric, index) => (
        <Card key={index}>
          <div style={{ padding: '16px' }} data-testid={metric.testId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Text variant="bodyMd" as="p" tone="subdued" data-testid={`${metric.testId}-title`}>
                  {metric.title}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text variant="headingXl" as="p" data-testid={`${metric.testId}-value`}>
                    {metric.value}
                  </Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text variant="bodySm" as="p" tone="success" data-testid={`${metric.testId}-change`}>
                    ↗ {metric.change}
                  </Text>
                </div>
              </div>
              <div 
                style={{ 
                  backgroundColor: `${metric.color}15`,
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '16px'
                }}
              >
                <div 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    backgroundColor: metric.color,
                    borderRadius: '4px'
                  }}
                  data-testid={`${metric.testId}-icon`}
                />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}