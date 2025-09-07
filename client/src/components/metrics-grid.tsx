import { Card, Text, SkeletonBodyText } from "@shopify/polaris";
import type { SystemStats, Transaction } from "@/lib/api";

interface MetricsGridProps {
  stats?: SystemStats;
  transactions?: Transaction[];
}

export default function MetricsGrid({ stats, transactions = [] }: MetricsGridProps) {
  if (!stats) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px' 
      }}>
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <div style={{ padding: '16px' }}>
              <SkeletonBodyText lines={1} />
              <div style={{ marginTop: '8px' }}>
                <SkeletonBodyText lines={2} />
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate total amount processed from successful transactions
  const totalAmountProcessed = transactions
    .filter(t => t.status === 'success')
    .reduce((total, transaction) => {
      const amount = parseFloat(transaction.amount);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);

  const metrics = [
    {
      title: "Total Amount Processed",
      value: formatCurrency(totalAmountProcessed),
      change: totalAmountProcessed > 100000 ? "🚀 High volume processing" : "📈 Processing payments",
      color: "#059669",
      testId: "metric-total-amount",
    },
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
      value: `${stats.activeProcessors}/57`,
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