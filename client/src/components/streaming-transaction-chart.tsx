import { useEffect, useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Transaction } from "@/lib/api";
import { format } from "date-fns";

interface StreamingTransactionChartProps {
  transactions?: Transaction[];
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  count: number;
  position: number;
}

export default function StreamingTransactionChart({ transactions = [] }: StreamingTransactionChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Chart configuration
  const WINDOW_SIZE = 60; // 60 seconds of data
  const UPDATE_INTERVAL = 1000; // Update every second
  const FLOW_SPEED = 1; // Positions per second flow rate
  const TOTAL_POSITIONS = 100; // Total chart positions

  // Create time buckets and aggregate transaction data
  const aggregateTransactions = (currentTime: number) => {
    const buckets = new Map<number, number>();
    const cutoffTime = currentTime - (WINDOW_SIZE * 1000);
    
    // Count transactions in 2-second buckets
    transactions.forEach(transaction => {
      const txTime = new Date(transaction.createdAt).getTime();
      if (txTime >= cutoffTime) {
        const bucketKey = Math.floor(txTime / 2000) * 2000;
        buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
      }
    });

    return buckets;
  };

  // Animation loop for flowing effect
  const animate = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    
    setCurrentTime(now);
    
    // Update data every second
    if (deltaTime >= UPDATE_INTERVAL) {
      const buckets = aggregateTransactions(now);
      
      // Create flowing data points
      const newData: ChartDataPoint[] = [];
      
      // Generate positions from right to left (0 = newest/rightmost, 100 = oldest/leftmost)
      for (let pos = 0; pos < TOTAL_POSITIONS; pos++) {
        const timeForPosition = now - (pos * (WINDOW_SIZE * 1000) / TOTAL_POSITIONS);
        const bucketKey = Math.floor(timeForPosition / 2000) * 2000;
        const count = buckets.get(bucketKey) || 0;
        
        newData.push({
          time: format(new Date(timeForPosition), 'HH:mm:ss'),
          timestamp: timeForPosition,
          count,
          position: pos
        });
      }
      
      setChartData(newData);
      lastUpdateRef.current = now;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [transactions]);

  // Custom tick formatter for X-axis (fixed time labels)
  const formatXAxisTick = (tickItem: any, index: number) => {
    // Show only every 20th tick to avoid crowding
    if (index % 20 === 0) {
      const timeAtPosition = currentTime - ((tickItem * WINDOW_SIZE * 1000) / TOTAL_POSITIONS);
      return format(new Date(timeAtPosition), 'HH:mm:ss');
    }
    return '';
  };

  // Custom dot component for flowing effect
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.count > 0) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={3} 
          fill="#3b82f6" 
          stroke="#ffffff" 
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative', height: '200px', width: '100%' }} data-testid="streaming-transaction-chart">
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

      {/* Recharts streaming chart */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <XAxis 
            dataKey="position"
            type="number"
            scale="linear"
            domain={[0, TOTAL_POSITIONS]}
            tickFormatter={formatXAxisTick}
            interval={0}
            axisLine={true}
            tickLine={true}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 'dataMax']}
            tick={{ fontSize: 12 }}
            axisLine={true}
            tickLine={true}
          />
          
          {/* Current time reference line */}
          <ReferenceLine 
            x={0} 
            stroke="#ef4444" 
            strokeDasharray="2 2"
            strokeWidth={1}
          />
          
          {/* Main data line */}
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={<CustomDot />}
            connectNulls={false}
            animationDuration={0}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Chart legend */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: '#64748b'
      }}>
        Transactions per 2-second interval | Real-time streaming
      </div>
    </div>
  );
}