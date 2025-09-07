import { useEffect, useRef, useState } from "react";
import type { Transaction } from "@/lib/api";
import { format, subHours, subDays, eachHourOfInterval, eachDayOfInterval } from "date-fns";
import { Button } from "@/components/ui/button";

interface TransactionChartProps {
  transactions?: Transaction[];
}

type TimePeriod = 'realtime' | '24h' | '1month';

export default function TransactionChart({ transactions }: TransactionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: any;
  }>({ visible: false, x: 0, y: 0, data: null });

  useEffect(() => {
    if (!transactions || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Generate data based on time period
    const now = new Date();
    let chartData: any[] = [];

    if (timePeriod === 'realtime') {
      // Last 2 minutes with 10-second intervals - rolling window
      const intervals = [];
      for (let i = 11; i >= 0; i--) {
        // Create intervals going backwards from now
        intervals.push(new Date(now.getTime() - i * 10 * 1000));
      }
      
      chartData = intervals.map(interval => {
        const nextInterval = new Date(interval.getTime() + 10 * 1000);
        
        const intervalTransactions = transactions.filter(t => {
          const transactionTime = new Date(t.createdAt);
          return transactionTime >= interval && transactionTime < nextInterval;
        });

        const successful = intervalTransactions.filter(t => t.status === 'success').length;
        const failed = intervalTransactions.filter(t => t.status === 'failed').length;
        const total = intervalTransactions.length;
        
        const totalVolume = intervalTransactions.reduce((sum, t) => {
          return sum + parseFloat(t.amount);
        }, 0);

        return {
          time: format(interval, 'HH:mm:ss'),
          total,
          successful,
          failed,
          volume: Math.round(totalVolume * 100) / 100,
          displayTime: format(interval, 'HH:mm:ss'),
        };
      });
    } else if (timePeriod === '24h') {
      // Last 24 hours with hourly intervals
      const startTime = subHours(now, 24);
      const hourlySlots = eachHourOfInterval({ start: startTime, end: now });

      chartData = hourlySlots.map(hour => {
        const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
        
        const hourTransactions = transactions.filter(t => {
          const transactionTime = new Date(t.createdAt);
          return transactionTime >= hour && transactionTime < nextHour;
        });

        const successful = hourTransactions.filter(t => t.status === 'success').length;
        const failed = hourTransactions.filter(t => t.status === 'failed').length;
        const total = hourTransactions.length;
        
        const totalVolume = hourTransactions.reduce((sum, t) => {
          return sum + parseFloat(t.amount);
        }, 0);

        return {
          time: format(hour, 'HH:mm'),
          total,
          successful,
          failed,
          volume: Math.round(totalVolume * 100) / 100,
          displayTime: format(hour, 'MMM d, HH:mm'),
        };
      });
    } else if (timePeriod === '1month') {
      // Last 30 days with daily intervals
      const startTime = subDays(now, 30);
      const dailySlots = eachDayOfInterval({ start: startTime, end: now });

      chartData = dailySlots.map(day => {
        const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
        
        const dayTransactions = transactions.filter(t => {
          const transactionTime = new Date(t.createdAt);
          return transactionTime >= day && transactionTime < nextDay;
        });

        const successful = dayTransactions.filter(t => t.status === 'success').length;
        const failed = dayTransactions.filter(t => t.status === 'failed').length;
        const total = dayTransactions.length;
        
        const totalVolume = dayTransactions.reduce((sum, t) => {
          return sum + parseFloat(t.amount);
        }, 0);

        return {
          time: format(day, 'MMM d'),
          total,
          successful,
          failed,
          volume: Math.round(totalVolume * 100) / 100,
          displayTime: format(day, 'MMM d, yyyy'),
        };
      });
    }

    // Chart dimensions
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    const maxValue = Math.max(...chartData.map(d => d.total), 1);
    const stepX = chartWidth / (chartData.length - 1);

    // Draw background grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines (show fewer for cleaner look)
    for (let i = 0; i < chartData.length; i += Math.max(2, Math.floor(chartData.length / 6))) {
      const x = padding.left + stepX * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw area chart
    if (chartData.length > 0) {
      const points = chartData.map((d, i) => ({
        x: padding.left + stepX * i,
        y: padding.top + chartHeight - (d.total / maxValue) * chartHeight,
        data: d
      }));

      // Create gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#3b82f620');

      // Draw filled area
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      
      for (let i = 0; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw smooth line using quadratic curves
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];
        
        if (i === 1) {
          // First curve point
          const controlX = (prevPoint.x + currentPoint.x) / 2;
          const controlY = (prevPoint.y + currentPoint.y) / 2;
          ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, controlX, controlY);
        } else {
          // Smooth curve using quadratic bezier
          const controlX = (prevPoint.x + currentPoint.x) / 2;
          const controlY = (prevPoint.y + currentPoint.y) / 2;
          ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, controlX, controlY);
        }
        
        if (i === points.length - 1) {
          // Complete the curve to the last point
          ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, currentPoint.x, currentPoint.y);
        }
      }
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw data points
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Store points for hover detection
      canvas.onmousemove = (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let closestPoint = null;
        let minDistance = Infinity;

        points.forEach(point => {
          const distance = Math.sqrt(
            Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
          );
          if (distance < 20 && distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        });

        if (closestPoint) {
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            data: closestPoint.data
          });
        } else {
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      };

      canvas.onmouseleave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
      };
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * (5 - i));
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(value.toString(), padding.left - 10, y);
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    chartData.forEach((d, i) => {
      const labelStep = Math.max(2, Math.floor(chartData.length / 6));
      if (i % labelStep === 0) { // Show fewer labels to avoid crowding
        const x = padding.left + stepX * i;
        ctx.fillText(d.time, x, padding.top + chartHeight + 10);
      }
    });

  }, [transactions, timePeriod]);

  // Auto-refresh for real-time view - creates sliding window effect
  useEffect(() => {
    if (timePeriod === 'realtime') {
      const interval = setInterval(() => {
        // Force re-render to update the rolling time window
        setTooltip(prev => ({ ...prev, x: Math.random() }));
      }, 2000); // Refresh every 2 seconds for smooth sliding

      return () => clearInterval(interval);
    }
  }, [timePeriod]);

  if (!transactions) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '2px solid #3b82f6', 
            borderTop: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 8px'
          }} />
          <p style={{ fontSize: '14px', color: '#64748b' }}>Loading chart data...</p>
        </div>
      </div>
    );
  }

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'realtime': return 'Real Time (Last 2min)';
      case '24h': return '24 Hours';
      case '1month': return '1 Month';
      default: return '24 Hours';
    }
  };

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="transaction-chart">
      {/* Time Period Controls */}
      <div style={{ 
        position: 'absolute', 
        top: '0px', 
        right: '0px', 
        display: 'flex', 
        gap: '4px',
        zIndex: 10
      }}>
        <Button
          variant={timePeriod === 'realtime' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('realtime')}
          data-testid="button-chart-realtime"
        >
          Real Time
        </Button>
        <Button
          variant={timePeriod === '24h' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('24h')}
          data-testid="button-chart-24h"
        >
          24hrs
        </Button>
        <Button
          variant={timePeriod === '1month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('1month')}
          data-testid="button-chart-1month"
        >
          1 Month
        </Button>
      </div>
      
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />
      
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            fontSize: '14px',
            pointerEvents: 'none'
          }}
        >
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>{tooltip.data?.displayTime}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p><strong>Total Transactions:</strong> {tooltip.data?.total}</p>
            <p><strong>Successful:</strong> {tooltip.data?.successful}</p>
            {tooltip.data?.failed > 0 && (
              <p style={{ color: '#ef4444' }}><strong>Failed:</strong> {tooltip.data?.failed}</p>
            )}
            <p style={{ color: '#3b82f6' }}><strong>Volume:</strong> ${tooltip.data?.volume}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}