import { useApp } from '../store';
import { formatZAR, formatZARShort } from '../utils/currency';

export default function Dashboard() {
  const { state } = useApp();
  const { transactions, products, customers, accounts } = state;

  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.total, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.total, 0);
  const pendingInvoices = transactions.filter(t => t.status === 'pending' || t.status === 'overdue').length;
  const lowStock = products.filter(p => p.stock < 20).length;
  const cashBalance = accounts.find(a => a.code === '1000')?.balance || 0;
  const receivables = accounts.find(a => a.code === '1100')?.balance || 0;

  const recentTransactions = transactions.slice(0, 5);

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const monthlySales = [28500, 32200, 29800, 35600, 41200, 38500, 42900, 46800, 50500, 48200, 52300, 55800];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Financial overview for your business</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Revenue</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatZAR(totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">Life-to-date sales</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Net Profit</p>
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatZAR(totalRevenue - totalExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">Revenue minus expenses</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Pending Invoices</p>
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{pendingInvoices}</p>
          <p className="text-xs text-slate-400 mt-1">Awaiting payment</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Low Stock Items</p>
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{lowStock}</p>
          <p className="text-xs text-slate-400 mt-1">Items below 20 units</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Sales (2025)</h3>
          <div className="flex items-end gap-2 h-40">
            {monthlySales.map((val, i) => {
              const max = Math.max(...monthlySales);
              const height = (val / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-medium">{formatZARShort(val)}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 transition-all cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}: ${formatZAR(val)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Cash at Bank</span>
              <span className="text-sm font-semibold text-slate-900">{formatZAR(cashBalance)}</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Receivables</span>
              <span className="text-sm font-semibold text-slate-900">{formatZAR(receivables)}</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Inventory Value</span>
              <span className="text-sm font-semibold text-slate-900">{formatZAR(products.reduce((s, p) => s + p.cost * p.stock, 0))}</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Customers</span>
              <span className="text-sm font-semibold text-slate-900">{customers.length}</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Products</span>
              <span className="text-sm font-semibold text-slate-900">{products.length}</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Transactions</span>
              <span className="text-sm font-semibold text-slate-900">{transactions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-slate-600">{t.date}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{t.description}</td>
                  <td className="px-5 py-3 text-slate-600">{t.customerName || '-'}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{formatZAR(t.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
