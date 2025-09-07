import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Transaction } from "@/lib/api";

interface RechartsTransactionChartProps {
  transactions?: Transaction[];
}

export default function RechartsTransactionChart({ transactions = [] }: RechartsTransactionChartProps) {
  const [chartData, setChartData] = useState<Array<{name: string, count: number}>>([]);

  // Initialize chart with reversed time labels (newest on right, oldest on left)
  const timeLabels = [
    { label: "10s", rangeStart: 9.5, rangeEnd: 10 },     // Leftmost (oldest)
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
    { label: "0.5s", rangeStart: 0, rangeEnd: 0.5 }      // Rightmost (newest)
  ];

  // Removed calculateNewestBucketCount to avoid closure issues
  // Now calculating fresh data directly in the shifting animation

  // Initialize chart data when transactions arrive - flowing animation will handle updates
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      console.log('🔄 Chart waiting for transactions...');
      return;
    }
    
    console.log('🔄 Chart initializing with transactions:', transactions.length, 'transactions');
    
    const now = Date.now();
    const initialData = timeLabels.map(timeSlot => {
      const count = transactions.filter(tx => {
        const ageInSeconds = (now - new Date(tx.createdAt).getTime()) / 1000;
        return ageInSeconds >= timeSlot.rangeStart && ageInSeconds < timeSlot.rangeEnd;
      }).length;
      
      return {
        name: timeSlot.label,
        count: count
      };
    });
    
    console.log('📈 Initial chart data:', initialData.map(d => `${d.name}:${d.count}`).join(', '));
    setChartData(initialData);
  }, [transactions]); // ← Re-run when transactions change

  // Removed shifting animation - caused jarring jumps
  // Now relying entirely on real-time data calculation which works correctly

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="recharts-transaction-chart">

      {/* Recharts Area Chart */}
      <div style={{ height: '180px', paddingTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
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
            <Bar 
              dataKey="count" 
              isAnimationActive={true}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => {
                const isNewest = index === chartData.length - 1;
                const isSecondNewest = index === chartData.length - 2;
                let fillColor;
                
                if (isNewest) {
                  fillColor = "#1d4ed8"; // Bright blue for newest data
                } else if (isSecondNewest) {
                  fillColor = "#2563eb"; // Medium blue for recent data
                } else {
                  fillColor = "#64748b"; // Gray for older data
                }
                
                return <Cell key={`cell-${index}`} fill={fillColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline flow indicator */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        fontSize: '11px',
        color: '#6b7280',
        gap: '8px'
      }}>
        <span style={{ color: '#64748b' }}>Old</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>←←←</span>
          <span style={{ fontWeight: '500' }}>Real-time Flow</span>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>←←←</span>
        </div>
        <span style={{ color: '#1d4ed8', fontWeight: '600' }}>New</span>
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
        Live Transaction Timeline | Flowing Left
      </div>
    </div>
  );
}