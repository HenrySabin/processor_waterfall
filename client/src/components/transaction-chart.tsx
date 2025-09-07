import { useEffect, useRef, useState } from "react";
import type { Transaction } from "@/lib/api";
import { format, subHours, eachHourOfInterval } from "date-fns";

interface TransactionChartProps {
  transactions?: Transaction[];
}

export default function TransactionChart({ transactions }: TransactionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    // Generate hourly data for the last 12 hours
    const now = new Date();
    const startTime = subHours(now, 12);
    const hourlySlots = eachHourOfInterval({ start: startTime, end: now });

    const chartData = hourlySlots.map(hour => {
      const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
      
      // Find transactions in this hour
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

    // Chart dimensions
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    const maxValue = Math.max(...chartData.map(d => d.total), 5);
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

    // Vertical grid lines
    for (let i = 0; i < chartData.length; i += 2) {
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

      // Draw line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
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
      if (i % 2 === 0) { // Show every other label to avoid crowding
        const x = padding.left + stepX * i;
        ctx.fillText(d.time, x, padding.top + chartHeight + 10);
      }
    });

  }, [transactions]);

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

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="transaction-chart">
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