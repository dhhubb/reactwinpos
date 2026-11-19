import { useState } from 'react';
import { useApp } from '../store';
import { formatZAR } from '../utils/currency';

export default function Invoices() {
  const { state, dispatch } = useApp();
  const { transactions } = state;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'sale' | 'payment' | 'expense'>('all');

  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !(t.customerName || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-emerald-600';
      case 'payment': return 'text-blue-600';
      case 'refund': return 'text-red-600';
      case 'expense': return 'text-amber-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales & Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Track all transactions and invoices</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Sales</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatZAR(transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.total, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {formatZAR(transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.total, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatZAR(transactions.filter(t => t.status === 'overdue').reduce((s, t) => s + t.total, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatZAR(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.total, 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['all', 'sale', 'payment', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Tax</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium capitalize ${typeColor(t.type)}`}>{t.type}</span>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800 max-w-[200px] truncate">{t.description}</td>
                  <td className="px-5 py-3 text-slate-600">{t.customerName || '-'}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatZAR(t.amount)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatZAR(t.tax)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatZAR(t.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const statuses: ('paid' | 'pending' | 'overdue' | 'cancelled')[] = ['paid', 'pending', 'overdue', 'cancelled'];
                          const idx = statuses.indexOf(t.status);
                          const nextStatus = statuses[(idx + 1) % statuses.length];
                          dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...t, status: nextStatus } });
                        }}
                        className="text-xs text-slate-400 hover:text-emerald-600 transition-colors"
                        title="Toggle status"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                      </button>
                      <button onClick={() => dispatch({ type: 'DELETE_TRANSACTION', payload: t.id })} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="font-medium">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
