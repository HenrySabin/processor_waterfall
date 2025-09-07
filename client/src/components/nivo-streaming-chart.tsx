import { useEffect, useState, useRef } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { Transaction } from "@/lib/api";
import { format } from "date-fns";

interface NivoStreamingChartProps {
  transactions?: Transaction[];
}

interface DataPoint {
  x: string;
  y: number;
  timestamp: number;
}

export default function NivoStreamingChart({ transactions = [] }: NivoStreamingChartProps) {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Chart configuration
  const WINDOW_SIZE = 60; // 60 seconds
  const UPDATE_INTERVAL = 1000; // Update every second
  const TOTAL_POINTS = 12; // 12 data points across 60 seconds = 5-second intervals

  // Fixed time labels that never change
  const getFixedTimeLabels = () => {
    return [
      "Now", "5s ago", "10s ago", "15s ago", "20s ago", "25s ago",
      "30s ago", "35s ago", "40s ago", "45s ago", "50s ago", "55s ago"
    ];
  };

  // Aggregate transactions into time buckets
  const aggregateTransactions = (currentTime: number) => {
    const buckets = new Map<number, number>();
    const cutoffTime = currentTime - (WINDOW_SIZE * 1000);
    
    // Count transactions in 5-second buckets
    transactions.forEach(transaction => {
      const txTime = new Date(transaction.createdAt).getTime();
      if (txTime >= cutoffTime) {
        const bucketKey = Math.floor(txTime / 5000) * 5000;
        buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
      }
    });

    return buckets;
  };

  // Animation loop for continuous updates
  const animate = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    
    // Update data every second
    if (deltaTime >= UPDATE_INTERVAL) {
      const buckets = aggregateTransactions(now);
      const labels = getFixedTimeLabels();
      
      // Generate data points with fixed labels
      const newData: DataPoint[] = labels.map((label, index) => {
        const secondsAgo = index * 5; // 5-second intervals
        const timeForPoint = now - (secondsAgo * 1000);
        const bucketKey = Math.floor(timeForPoint / 5000) * 5000;
        const count = buckets.get(bucketKey) || 0;
        
        return {
          x: label,
          y: count,
          timestamp: timeForPoint
        };
      });
      
      setChartData(newData);
      lastUpdateRef.current = now;
    }
    
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

  // Format data for Nivo
  const nivoData = [
    {
      id: "transactions",
      data: chartData
    }
  ];

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="nivo-streaming-chart">
      {/* Live indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '20px',
        zIndex: 10,
        color: '#ef4444',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        ● LIVE
      </div>

      {/* Nivo Line Chart */}
      <ResponsiveLine
        data={nivoData}
        margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: 'auto',
          stacked: false,
          reverse: false
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Transactions',
          legendOffset: -30,
          legendPosition: 'middle'
        }}
        pointSize={6}
        pointColor="#3b82f6"
        pointBorderWidth={2}
        pointBorderColor="#ffffff"
        pointLabelYOffset={-12}
        useMesh={true}
        curve="monotoneX"
        lineWidth={3}
        colors={['#3b82f6']}
        enableArea={true}
        areaOpacity={0.2}
        areaBaselineValue={0}
        enableGridX={true}
        enableGridY={true}
        gridXValues={chartData.map((_, index) => index)}
        gridYValues={5}
        animate={false} // Disable built-in animation for smoother real-time updates
        isInteractive={true}
        tooltip={({ point }) => (
          <div
            style={{
              background: 'white',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <strong>{point.data.x}</strong>
            <br />
            Transactions: {point.data.y}
          </div>
        )}
        theme={{
          background: 'transparent',
          text: {
            fontSize: 12,
            fill: '#64748b'
          },
          axis: {
            domain: {
              line: {
                stroke: '#e2e8f0',
                strokeWidth: 1
              }
            },
            legend: {
              text: {
                fontSize: 12,
                fill: '#64748b'
              }
            },
            ticks: {
              line: {
                stroke: '#e2e8f0',
                strokeWidth: 1
              },
              text: {
                fontSize: 11,
                fill: '#64748b'
              }
            }
          },
          grid: {
            line: {
              stroke: '#f1f5f9',
              strokeWidth: 1
            }
          }
        }}
      />

      {/* Chart info */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: '#64748b'
      }}>
        Transactions per 5-second interval | Real-time streaming
      </div>
    </div>
  );
}