import { useEffect, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { Transaction } from "@/lib/api";

interface SimpleChartProps {
  transactions?: Transaction[];
}

export default function NivoStreamingChart({ transactions = [] }: SimpleChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  // Update chart data when transactions change
  useEffect(() => {
    const now = Date.now();
    const timeLabels = ["Now", "10s", "20s", "30s", "40s", "50s"];
    
    // Count transactions in each time bucket
    const counts = timeLabels.map(label => {
      const bucketStart = timeLabels.indexOf(label) * 10; // 0, 10, 20, 30, 40, 50 seconds ago
      const bucketEnd = bucketStart + 10;
      
      const count = transactions.filter(tx => {
        const ageInSeconds = (now - new Date(tx.createdAt).getTime()) / 1000;
        return ageInSeconds >= bucketStart && ageInSeconds < bucketEnd;
      }).length;
      
      return { x: label, y: count };
    });
    
    setChartData([{ id: "transactions", data: counts }]);
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

      {/* Simple Line Chart */}
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: 'auto'
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0
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
        useMesh={true}
        curve="monotoneX"
        lineWidth={3}
        colors={['#3b82f6']}
        enableArea={true}
        areaOpacity={0.2}
        enableGridX={true}
        enableGridY={true}
        animate={false}
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
        Transaction volume by time period
      </div>
    </div>
  );
}