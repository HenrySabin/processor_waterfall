import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Transaction } from "@/lib/api";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartJSTransactionChartProps {
  transactions?: Transaction[];
}

export default function ChartJSTransactionChart({ transactions = [] }: ChartJSTransactionChartProps) {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [{
      label: 'Transaction Count',
      data: [],
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      borderWidth: 1,
    }]
  });

  // Update chart data when transactions change
  useEffect(() => {
    const now = Date.now();
    const timeLabels = [
      { label: "50s ago", seconds: 50 },
      { label: "40s ago", seconds: 40 },
      { label: "30s ago", seconds: 30 },
      { label: "20s ago", seconds: 20 },
      { label: "10s ago", seconds: 10 },
      { label: "Now", seconds: 0 }
    ];
    
    // Count transactions in each time bucket
    const data = timeLabels.map(timeSlot => {
      const count = transactions.filter(tx => {
        const ageInSeconds = (now - new Date(tx.createdAt).getTime()) / 1000;
        const rangeStart = timeSlot.seconds;
        const rangeEnd = timeSlot.seconds + 10;
        return ageInSeconds >= rangeStart && ageInSeconds < rangeEnd;
      }).length;
      
      return count;
    });
    
    setChartData({
      labels: timeLabels.map(t => t.label),
      datasets: [{
        label: 'Transaction Count',
        data: data,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 4,
      }]
    });
  }, [transactions]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb',
        borderColor: '#374151',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#6b7280',
        },
        grid: {
          color: '#e5e7eb',
        }
      },
      x: {
        ticks: {
          color: '#6b7280',
        },
        grid: {
          display: false,
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    }
  };

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="chartjs-transaction-chart">
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

      {/* Chart.js Bar Chart */}
      <div style={{ height: '180px', paddingTop: '10px' }}>
        <Bar data={chartData} options={options} />
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
        Transaction volume by time period | Chart.js
      </div>
    </div>
  );
}