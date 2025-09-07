import { useEffect, useState, useRef } from "react";
import { ResponsiveStream } from "@nivo/stream";
import type { Transaction } from "@/lib/api";

interface NivoStreamingChartProps {
  transactions?: Transaction[];
}

interface StackedDataPoint {
  time: string;
  Stripe: number;
  PayPal: number;
  Square: number;
}

export default function NivoStreamingChart({ transactions = [] }: NivoStreamingChartProps) {
  const [chartData, setChartData] = useState<StackedDataPoint[]>([]);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Fixed time labels that never change
  const TIME_LABELS = ["Now", "10s", "20s", "30s", "40s", "50s", "60s"];

  // Animation loop for real-time updates
  const animate = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    
    // Update every second
    if (deltaTime >= 1000) {
      // Create buckets for each time period and processor
      const buckets = new Map<string, { Stripe: number; PayPal: number; Square: number }>();
      
      // Initialize all buckets to 0
      TIME_LABELS.forEach(label => {
        buckets.set(label, { Stripe: 0, PayPal: 0, Square: 0 });
      });
      
      // Count recent transactions by processor and time bucket
      transactions.forEach(transaction => {
        const txTime = new Date(transaction.createdAt).getTime();
        const ageInSeconds = (now - txTime) / 1000;
        const processorName = transaction.processor || 'Stripe';
        
        let timeBucket = "60s";
        if (ageInSeconds <= 5) {
          timeBucket = "Now";
        } else if (ageInSeconds <= 15) {
          timeBucket = "10s";
        } else if (ageInSeconds <= 25) {
          timeBucket = "20s";
        } else if (ageInSeconds <= 35) {
          timeBucket = "30s";
        } else if (ageInSeconds <= 45) {
          timeBucket = "40s";
        } else if (ageInSeconds <= 55) {
          timeBucket = "50s";
        }
        
        const bucket = buckets.get(timeBucket);
        if (bucket) {
          if (processorName.includes('Stripe')) {
            bucket.Stripe += 1;
          } else if (processorName.includes('PayPal')) {
            bucket.PayPal += 1;
          } else if (processorName.includes('Square')) {
            bucket.Square += 1;
          } else {
            bucket.Stripe += 1; // Default to Stripe
          }
        }
      });
      
      // Create stacked data points
      const newData: StackedDataPoint[] = TIME_LABELS.map(label => {
        const bucket = buckets.get(label) || { Stripe: 0, PayPal: 0, Square: 0 };
        return {
          time: label,
          Stripe: bucket.Stripe,
          PayPal: bucket.PayPal,
          Square: bucket.Square
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

      {/* Nivo Stream Chart - Real-time Stacked Area */}
      <ResponsiveStream
        data={chartData}
        keys={['Stripe', 'PayPal', 'Square']}
        margin={{ top: 20, right: 30, bottom: 40, left: 50 }}
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
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        enableGridX={true}
        enableGridY={true}
        offsetType="none"
        order="none"
        curve="monotoneX"
        colors={['#3b82f6', '#10b981', '#f59e0b']} // Blue for Stripe, Green for PayPal, Orange for Square
        fillOpacity={0.85}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
        animate={false}
        isInteractive={true}
        tooltip={({ layer, slice }) => (
          <div
            style={{
              background: 'white',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <strong>{slice.id}</strong>
            <br />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
                <span>Stripe: {slice.data?.Stripe || 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
                <span>PayPal: {slice.data?.PayPal || 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
                <span>Square: {slice.data?.Square || 0}</span>
              </div>
            </div>
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