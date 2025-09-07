import { useEffect, useState, useRef } from "react";
import { Card, Text, Box, InlineStack } from "@shopify/polaris";
import type { Transaction } from "@/lib/api";
import { format } from "date-fns";

interface PolarisStreamingChartProps {
  transactions?: Transaction[];
}

interface ChartDataPoint {
  timestamp: number;
  count: number;
  position: number;
}

export default function PolarisStreamingChart({ transactions = [] }: PolarisStreamingChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Chart configuration
  const WINDOW_SIZE = 60; // 60 seconds
  const UPDATE_INTERVAL = 1000; // Update every second
  const CHART_WIDTH = 100; // Number of data points

  // Create fixed time labels
  const getTimeLabels = () => {
    return ['Now', '15s', '30s', '45s', '60s'];
  };

  // Aggregate transactions into time buckets
  const aggregateTransactions = (currentTime: number) => {
    const buckets = new Map<number, number>();
    const cutoffTime = currentTime - (WINDOW_SIZE * 1000);
    
    transactions.forEach(transaction => {
      const txTime = new Date(transaction.createdAt).getTime();
      if (txTime >= cutoffTime) {
        const bucketKey = Math.floor(txTime / 5000) * 5000;
        buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
      }
    });

    return buckets;
  };

  // Animation loop
  const animate = () => {
    const now = Date.now();
    setCurrentTime(now);
    
    // Update data every second
    const buckets = aggregateTransactions(now);
    const newData: ChartDataPoint[] = [];
    
    // Generate chart positions (0 = newest, 100 = oldest)
    for (let pos = 0; pos < CHART_WIDTH; pos++) {
      const timeForPosition = now - (pos * (WINDOW_SIZE * 1000) / CHART_WIDTH);
      const bucketKey = Math.floor(timeForPosition / 5000) * 5000;
      const count = buckets.get(bucketKey) || 0;
      
      newData.push({
        timestamp: timeForPosition,
        count,
        position: pos
      });
    }
    
    setChartData(newData);
    animationRef.current = requestAnimationFrame(animate);
  };

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [transactions]);

  // Calculate chart dimensions and scaling
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const chartHeight = 150;

  // Generate SVG path for the line chart
  const generatePath = () => {
    if (chartData.length === 0) return '';
    
    const width = 100; // SVG viewBox width percentage
    const points = chartData.map((point, index) => {
      const x = (index / (chartData.length - 1)) * width;
      const y = chartHeight - (point.count / maxCount) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  // Generate bars for better visualization
  const generateBars = () => {
    return chartData.map((point, index) => {
      const x = (index / chartData.length) * 100;
      const height = (point.count / maxCount) * 100;
      const barWidth = 100 / chartData.length;
      
      return (
        <rect
          key={index}
          x={`${x}%`}
          y={`${100 - height}%`}
          width={`${barWidth * 0.8}%`}
          height={`${height}%`}
          fill="#3b82f6"
          opacity={point.count > 0 ? 0.7 : 0.1}
          rx="1"
        />
      );
    });
  };

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="polaris-streaming-chart">
      {/* Live indicator */}
      <Box position="absolute" insetBlockStart="4" insetInlineEnd="4">
        <Text variant="bodySm" tone="critical" fontWeight="bold">
          ● LIVE
        </Text>
      </Box>

      {/* Chart container */}
      <div style={{ height: '150px', margin: '20px 0', position: 'relative' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ border: '1px solid #e1e3e5', borderRadius: '4px' }}
        >
          {/* Background grid */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={`${y}%`}
              x2="100%"
              y2={`${y}%`}
              stroke="#f1f2f4"
              strokeWidth="0.5"
            />
          ))}
          
          {[0, 25, 50, 75, 100].map(x => (
            <line
              key={x}
              x1={`${x}%`}
              y1="0"
              x2={`${x}%`}
              y2="100%"
              stroke="#f1f2f4"
              strokeWidth="0.5"
            />
          ))}

          {/* Data bars */}
          {generateBars()}
          
          {/* Current time indicator */}
          <line
            x1="0%"
            y1="0"
            x2="0%"
            y2="100%"
            stroke="#e53e3e"
            strokeWidth="2"
            strokeDasharray="2,2"
          />
        </svg>

        {/* Y-axis labels */}
        <div style={{ 
          position: 'absolute', 
          left: '-30px', 
          top: '0', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#6d7175'
        }}>
          <span>{maxCount}</span>
          <span>{Math.round(maxCount * 0.75)}</span>
          <span>{Math.round(maxCount * 0.5)}</span>
          <span>{Math.round(maxCount * 0.25)}</span>
          <span>0</span>
        </div>
      </div>

      {/* Fixed time labels */}
      <InlineStack gap="4" align="space-between">
        {getTimeLabels().map((label, index) => (
          <Text key={index} variant="bodySm" tone="subdued">
            {label}
          </Text>
        ))}
      </InlineStack>

      {/* Chart info */}
      <Box paddingBlockStart="2">
        <Text variant="bodySm" tone="subdued" alignment="center">
          Transactions per 5-second interval | Real-time streaming
        </Text>
      </Box>
    </div>
  );
}