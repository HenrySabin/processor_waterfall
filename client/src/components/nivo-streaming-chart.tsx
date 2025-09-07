import { useEffect, useState, useRef } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { Transaction } from "@/lib/api";

interface NivoStreamingChartProps {
  transactions?: Transaction[];
}

interface DataPoint {
  x: string;
  y: number;
}

export default function NivoStreamingChart({ transactions = [] }: NivoStreamingChartProps) {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Fixed time labels that never change
  const TIME_LABELS = ["Now", "10s", "20s", "30s", "40s", "50s", "60s"];

  // Animation loop
  const animate = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    
    // Update every second
    if (deltaTime >= 1000) {
      // Create buckets for each time period
      const buckets = new Map<string, number>();
      
      // Initialize all buckets to 0
      TIME_LABELS.forEach(label => buckets.set(label, 0));
      
      // Count recent transactions
      transactions.forEach(transaction => {
        const txTime = new Date(transaction.createdAt).getTime();
        const ageInSeconds = (now - txTime) / 1000;
        
        // Determine which bucket this transaction belongs to
        if (ageInSeconds <= 5) {
          buckets.set("Now", (buckets.get("Now") || 0) + 1);
        } else if (ageInSeconds <= 15) {
          buckets.set("10s", (buckets.get("10s") || 0) + 1);
        } else if (ageInSeconds <= 25) {
          buckets.set("20s", (buckets.get("20s") || 0) + 1);
        } else if (ageInSeconds <= 35) {
          buckets.set("30s", (buckets.get("30s") || 0) + 1);
        } else if (ageInSeconds <= 45) {
          buckets.set("40s", (buckets.get("40s") || 0) + 1);
        } else if (ageInSeconds <= 55) {
          buckets.set("50s", (buckets.get("50s") || 0) + 1);
        } else if (ageInSeconds <= 65) {
          buckets.set("60s", (buckets.get("60s") || 0) + 1);
        }
      });
      
      // Create data points
      const newData: DataPoint[] = TIME_LABELS.map(label => ({
        x: label,
        y: buckets.get(label) || 0
      }));
      
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