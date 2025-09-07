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
      { label: "10s", rangeStart: 9.5, rangeEnd: 10 },
      { label: "9.5s", rangeStart: 9, rangeEnd: 9.5 },
      { label: "9s", rangeStart: 8.5, rangeEnd: 9 },
      { label: "8.5s", rangeStart: 8, rangeEnd: 8.5 },
      { label: "8s", rangeStart: 7.5, rangeEnd: 8 },
      { label: "7.5s", rangeStart: 7, rangeEnd: 7.5 },
      { label: "7s", rangeStart: 6.5, rangeEnd: 7 },
      { label: "6.5s", rangeStart: 6, rangeEnd: 6.5 },
      { label: "6s", rangeStart: 5.5, rangeEnd: 6 },
      { label: "5.5s", rangeStart: 5, rangeEnd: 5.5 },
      { label: "5s", rangeStart: 4.5, rangeEnd: 5 },
      { label: "4.5s", rangeStart: 4, rangeEnd: 4.5 },
      { label: "4s", rangeStart: 3.5, rangeEnd: 4 },
      { label: "3.5s", rangeStart: 3, rangeEnd: 3.5 },
      { label: "3s", rangeStart: 2.5, rangeEnd: 3 },
      { label: "2.5s", rangeStart: 2, rangeEnd: 2.5 },
      { label: "2s", rangeStart: 1.5, rangeEnd: 2 },
      { label: "1.5s", rangeStart: 1, rangeEnd: 1.5 },
      { label: "1s", rangeStart: 0.5, rangeEnd: 1 },
      { label: "0.5s", rangeStart: 0, rangeEnd: 0.5 }
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
              domain={[1, 10]}
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