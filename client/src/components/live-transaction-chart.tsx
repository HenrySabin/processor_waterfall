import { useEffect, useRef, useState, useCallback } from "react";
import type { Transaction } from "@/lib/api";
import { format } from "date-fns";

interface LiveTransactionChartProps {
  transactions?: Transaction[];
}

interface DataPoint {
  timestamp: number;
  count: number;
  x: number;
  y: number;
}

export default function LiveTransactionChart({ transactions = [] }: LiveTransactionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataPointsRef = useRef<DataPoint[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());
  const timeOffsetRef = useRef<number>(0);
  
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    count: number;
    time: string;
  }>({ visible: false, x: 0, y: 0, count: 0, time: '' });

  // Constants for the flowing chart
  const CHART_DURATION = 60000; // Show last 60 seconds
  const PIXELS_PER_SECOND = 2; // How fast the chart flows (pixels per second)
  const UPDATE_INTERVAL = 1000; // Update data every 1 second
  const MAX_DATA_POINTS = 120; // Keep 2 minutes of data points

  // Aggregate transactions into time buckets
  const aggregateTransactions = useCallback((currentTime: number) => {
    const bucketSize = 2000; // 2-second buckets
    const buckets = new Map<number, number>();
    
    // Count transactions in recent time buckets
    const cutoffTime = currentTime - CHART_DURATION;
    
    transactions.forEach(transaction => {
      const txTime = new Date(transaction.createdAt).getTime();
      if (txTime >= cutoffTime) {
        const bucketKey = Math.floor(txTime / bucketSize) * bucketSize;
        buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
      }
    });

    return buckets;
  }, [transactions]);

  // Animation loop for smooth flowing chart
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size for high DPI displays
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    
    // Update time offset for flowing effect
    timeOffsetRef.current += deltaTime * PIXELS_PER_SECOND / 1000;
    
    // Update data points periodically
    if (deltaTime >= UPDATE_INTERVAL) {
      const buckets = aggregateTransactions(now);
      
      // Add new data points
      const newPoints: DataPoint[] = [];
      for (const [timestamp, count] of buckets.entries()) {
        newPoints.push({
          timestamp,
          count,
          x: 0, // Will be calculated during rendering
          y: 0  // Will be calculated during rendering
        });
      }
      
      // Replace old data points with new ones
      dataPointsRef.current = newPoints;
      lastUpdateRef.current = now;
    }

    // Chart dimensions
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate positions for data points
    const maxCount = Math.max(...dataPointsRef.current.map(p => p.count), 1);
    const currentTime = now;
    
    const visiblePoints = dataPointsRef.current
      .filter(point => {
        const age = currentTime - point.timestamp;
        return age <= CHART_DURATION;
      })
      .map(point => {
        const age = currentTime - point.timestamp;
        // Flow from left to right: newer data on right, older on left
        const baseX = chartWidth - (age * PIXELS_PER_SECOND / 1000);
        
        return {
          ...point,
          x: padding.left + baseX,
          y: padding.top + chartHeight - (point.count / maxCount) * chartHeight
        };
      })
      .filter(point => point.x >= padding.left - 50 && point.x <= padding.left + chartWidth + 50);

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

    // Vertical grid lines (static)
    const gridSpacing = 80; // Pixels between vertical lines
    for (let x = padding.left; x <= padding.left + chartWidth; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw flowing area chart
    if (visiblePoints.length > 1) {
      // Sort points by x position
      visiblePoints.sort((a, b) => a.x - b.x);

      // Create gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, '#3b82f6aa');
      gradient.addColorStop(1, '#3b82f620');

      // Draw filled area
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, padding.top + chartHeight);
      
      visiblePoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw smooth line
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      
      for (let i = 1; i < visiblePoints.length; i++) {
        const prevPoint = visiblePoints[i - 1];
        const currentPoint = visiblePoints[i];
        const controlX = (prevPoint.x + currentPoint.x) / 2;
        const controlY = (prevPoint.y + currentPoint.y) / 2;
        ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, controlX, controlY);
      }
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw data points
      visiblePoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxCount / 5) * (5 - i));
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(value.toString(), padding.left - 10, y);
    }

    // Draw static X-axis time labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const labelSpacing = 120; // Pixels between time labels
    const numLabels = Math.floor(chartWidth / labelSpacing) + 1;
    
    for (let i = 0; i < numLabels; i++) {
      const x = padding.left + i * labelSpacing;
      if (x <= padding.left + chartWidth) {
        // Calculate time for this position (going backwards from current time)
        const secondsBack = ((chartWidth - (x - padding.left)) / PIXELS_PER_SECOND);
        const timeAtPosition = currentTime - (secondsBack * 1000);
        const timeLabel = format(new Date(timeAtPosition), 'HH:mm:ss');
        ctx.fillText(timeLabel, x, padding.top + chartHeight + 10);
      }
    }

    // Draw "LIVE" indicator
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('● LIVE', rect.width - 20, 10);

    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [aggregateTransactions]);

  // Start animation on mount
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Handle mouse interactions for tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Find closest data point for tooltip
    let closestPoint = null;
    let minDistance = Infinity;

    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const currentTime = Date.now();

    dataPointsRef.current.forEach(point => {
      const age = currentTime - point.timestamp;
      if (age <= CHART_DURATION) {
        const baseX = (rect.width - padding.left - padding.right) - (age * PIXELS_PER_SECOND / 1000);
        const x = padding.left + baseX;
        const maxCount = Math.max(...dataPointsRef.current.map(p => p.count), 1);
        const y = padding.top + (rect.height - padding.top - padding.bottom) - (point.count / maxCount) * (rect.height - padding.top - padding.bottom);
        
        const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
        if (distance < 20 && distance < minDistance) {
          minDistance = distance;
          closestPoint = {
            count: point.count,
            time: format(new Date(point.timestamp), 'HH:mm:ss'),
            x: event.clientX,
            y: event.clientY
          };
        }
      }
    });

    if (closestPoint) {
      setTooltip({
        visible: true,
        x: closestPoint.x,
        y: closestPoint.y,
        count: closestPoint.count,
        time: closestPoint.time
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div style={{ position: 'relative', height: '200px' }} data-testid="live-transaction-chart">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
          <p style={{ fontWeight: '600', marginBottom: '4px' }}>{tooltip.time}</p>
          <p><strong>Transactions:</strong> {tooltip.count}</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}