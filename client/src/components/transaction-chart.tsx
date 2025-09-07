import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Transaction } from "@/lib/api";
import { format, subHours, eachHourOfInterval } from "date-fns";

interface TransactionChartProps {
  transactions?: Transaction[];
}

export default function TransactionChart({ transactions }: TransactionChartProps) {
  if (!transactions) {
    return (
      <div className="h-[200px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    );
  }

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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
          <p className="text-sm font-medium text-foreground">{data.displayTime}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm text-chart-2">
              <span className="font-medium">Total Transactions:</span> {data.total}
            </p>
            <p className="text-sm text-chart-2">
              <span className="font-medium">Successful:</span> {data.successful}
            </p>
            {data.failed > 0 && (
              <p className="text-sm text-destructive">
                <span className="font-medium">Failed:</span> {data.failed}
              </p>
            )}
            <p className="text-sm text-primary">
              <span className="font-medium">Volume:</span> ${data.volume}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxTransactions = Math.max(...chartData.map(d => d.total), 5);

  return (
    <div className="h-[200px]" data-testid="transaction-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="transactionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            domain={[0, maxTransactions]}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#transactionGradient)"
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}