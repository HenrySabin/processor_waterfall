import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from "@/lib/api";

interface RechartsTransactionChartProps {
  transactions?: Transaction[];
}

export default function RechartsTransactionChart({ transactions = [] }: RechartsTransactionChartProps) {
  const [chartData, setChartData] = useState<Array<{name: string, count: number}>>([]);

  // Update chart data when transactions change
  useEffect(() => {
    const now = Date.now();
    const timeLabels = [
      { label: "5s ago", rangeStart: 4, rangeEnd: 5 },
      { label: "4s ago", rangeStart: 3, rangeEnd: 4 },
      { label: "3s ago", rangeStart: 2, rangeEnd: 3 },
      { label: "2s ago", rangeStart: 1, rangeEnd: 2 },
      { label: "1s ago", rangeStart: 0, rangeEnd: 1 }
    ];
    
    // Count transactions in each time bucket
    const data = timeLabels.map(timeSlot => {
      const count = transactions.filter(tx => {
        const ageInSeconds = (now - new Date(tx.createdAt).getTime()) / 1000;
        return ageInSeconds >= timeSlot.rangeStart && ageInSeconds < timeSlot.rangeEnd;
      }).length;
      
      return {
        name: timeSlot.label,
        count: count
      };
    });
    
    setChartData(data);
  }, [transactions]);

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="recharts-transaction-chart">
      {/* Live indicator */}
      <div style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        zIndex: 10,
        color: '#ef4444',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        ● LIVE
      </div>

      {/* Recharts Area Chart */}
      <div style={{ height: '180px', paddingTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb'
              }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <Area 
              type="monotone"
              dataKey="count" 
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorGradient)"
              animationDuration={750}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart info */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: '#64748b'
      }}>
        Transaction volume by time period | Area Histogram
      </div>
    </div>
  );
}