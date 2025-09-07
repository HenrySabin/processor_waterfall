import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface RecentTransactionsProps {}

export default function RecentTransactions({}: RecentTransactionsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const offset = (currentPage - 1) * itemsPerPage;

  const { data: wsData, isConnected } = useWebSocket();
  const isLoading = !isConnected;
  
  const transactions = wsData.transactions?.transactions || [];
  const totalTransactions = wsData.transactions?.pagination?.total || 0;
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-chart-2 text-white';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      case 'pending':
        return 'bg-chart-4 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
        </div>
        <div className="animate-pulse">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border">
                <div className="flex space-x-4">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
                <div className="h-4 bg-muted rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border" data-testid="recent-transactions">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground" data-testid="transactions-title">Recent Transactions</h3>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="link-view-all-transactions">
          <i className="fas fa-external-link-alt mr-1"></i>
          View All
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Transaction ID</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Amount</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Processor</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Status</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">Time</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground" data-testid="no-transactions">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-border hover:bg-accent" data-testid={`transaction-row-${transaction.id}`}>
                  <td className="py-3 px-4 text-sm font-mono text-foreground" data-testid={`transaction-id-${transaction.id}`}>
                    {transaction.id.substring(0, 12)}...
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground font-medium" data-testid={`transaction-amount-${transaction.id}`}>
                    ${transaction.amount} {transaction.currency}
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground" data-testid={`transaction-processor-${transaction.id}`}>
                    {transaction.processorId || 'N/A'}
                  </td>
                  <td className="py-3 px-4" data-testid={`transaction-status-${transaction.id}`}>
                    <span className={`px-2 py-1 rounded text-xs capitalize ${getStatusBadgeColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground" data-testid={`transaction-time-${transaction.id}`}>
                    {formatTimeAgo(transaction.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Showing {transactions.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTransactions)} of {totalTransactions} transactions
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            data-testid="button-previous-page"
          >
            <i className="fas fa-chevron-left mr-1"></i>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= totalPages}
            data-testid="button-next-page"
          >
            Next
            <i className="fas fa-chevron-right ml-1"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
