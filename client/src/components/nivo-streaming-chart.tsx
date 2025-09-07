import { useEffect, useState } from "react";
import FusionCharts from "fusioncharts";
import Charts from "fusioncharts/fusioncharts.charts";
import ReactFusionCharts from "react-fusioncharts";
import type { Transaction } from "@/lib/api";

// Initialize FusionCharts with required modules
Charts(FusionCharts);

interface FusionStreamingChartProps {
  transactions?: Transaction[];
}

export default function NivoStreamingChart({ transactions = [] }: FusionStreamingChartProps) {
  const [chartData, setChartData] = useState<any>({
    chart: {
      caption: "Transaction Volume",
      subCaption: "Live transaction monitoring",
      xAxisName: "Time Period",
      yAxisName: "Transaction Count",
      numberSuffix: "",
      theme: "fusion",
      paletteColors: "#3b82f6",
      bgColor: "#ffffff",
      showCanvasBorder: "0",
      usePlotGradientColor: "0",
      plotBorderAlpha: "10",
      placeValuesInside: "0",
      valueFontColor: "#333333",
      showHoverEffect: "1"
    },
    data: []
  });

  // Update chart data when transactions change
  useEffect(() => {
    const now = Date.now();
    const timeLabels = [
      { label: "Now", seconds: 0 },
      { label: "10s ago", seconds: 10 },
      { label: "20s ago", seconds: 20 },
      { label: "30s ago", seconds: 30 },
      { label: "40s ago", seconds: 40 },
      { label: "50s ago", seconds: 50 }
    ];
    
    // Count transactions in each time bucket
    const data = timeLabels.map(timeSlot => {
      const count = transactions.filter(tx => {
        const ageInSeconds = (now - new Date(tx.createdAt).getTime()) / 1000;
        const rangeStart = timeSlot.seconds;
        const rangeEnd = timeSlot.seconds + 10;
        return ageInSeconds >= rangeStart && ageInSeconds < rangeEnd;
      }).length;
      
      return {
        label: timeSlot.label,
        value: count.toString()
      };
    });
    
    setChartData(prev => ({
      ...prev,
      data: data
    }));
  }, [transactions]);

  const chartConfigs = {
    type: "column2d",
    width: "100%",
    height: "180",
    dataFormat: "json",
    dataSource: chartData
  };

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="fusion-streaming-chart">
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

      {/* FusionCharts Column Chart */}
      <ReactFusionCharts {...chartConfigs} />

      {/* Chart info */}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: '#64748b'
      }}>
        Transaction volume by time period | FusionCharts
      </div>
    </div>
  );
}