import { useState, useMemo } from 'react';
import { useApp } from '../store';
import { formatZAR } from '../utils/currency';

export default function Reports() {
  const { state, dispatch } = useApp();
  const { transactions, products, customers, accounts, reportDateFrom, reportDateTo, reportSortBy, reportSortDir } = state;

  // Local UI state
  const [reportType, setReportType] = useState<'financial' | 'sales' | 'products' | 'customers'>('financial');
  const [includeTax, setIncludeTax] = useState(true);
  const [groupBy, setGroupBy] = useState<'all' | 'month' | 'category'>('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'sale' | 'expense' | 'payment'>('all');

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (reportDateFrom && t.date < reportDateFrom) return false;
      if (reportDateTo && t.date > reportDateTo) return false;
      if (saleTypeFilter !== 'all' && t.type !== saleTypeFilter) return false;
      return true;
    });
  }, [transactions, reportDateFrom, reportDateTo, saleTypeFilter]);

  // Cancelled sales are void: they must never inflate revenue, COGS, product
  // rankings or customer totals.
  const billableSales = useMemo(
    () => filteredTransactions.filter(t => t.type === 'sale' && t.status !== 'cancelled'),
    [filteredTransactions]
  );

  // Sort transactions for the detail view
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (reportSortBy) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'amount': cmp = a.total - b.total; break;
        case 'customer': cmp = (a.customerName || '').localeCompare(b.customerName || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return reportSortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredTransactions, reportSortBy, reportSortDir]);

  // Computed financials from filtered data
  const financials = useMemo(() => {
    const revenue = billableSales
      .reduce((s, t) => s + (includeTax ? t.total : t.amount), 0);
    const cogs = billableSales
      .reduce((s, t) => {
        const c = t.items?.reduce((is, item) => {
          const product = products.find(p => p.id === item.productId);
          return is + (product ? product.cost * item.quantity : 0);
        }, 0) || 0;
        return s + c;
      }, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.status !== 'cancelled')
      .reduce((s, t) => s + t.total, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    return { revenue, cogs, expenses, grossProfit, netProfit, grossMargin };
  }, [billableSales, filteredTransactions, products, includeTax]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { sold: number; revenue: number; cost: number }>();
    billableSales.forEach(t => {
      t.items?.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cat = product?.category || 'Uncategorized';
        const existing = map.get(cat) || { sold: 0, revenue: 0, cost: 0 };
        existing.sold += item.quantity;
        existing.revenue += item.price * item.quantity;
        existing.cost += (product?.cost || 0) * item.quantity;
        map.set(cat, existing);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [billableSales, products]);

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, { revenue: number; expenses: number; count: number }>();
    filteredTransactions.forEach(t => {
      const month = t.date.substring(0, 7);
      const existing = map.get(month) || { revenue: 0, expenses: 0, count: 0 };
      if (t.type === 'sale' && t.status !== 'cancelled') existing.revenue += t.total;
      if (t.type === 'expense') existing.expenses += t.total;
      existing.count++;
      map.set(month, existing);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTransactions]);

  // Top products from filtered data
  const topProducts = useMemo(() => {
    return [...products]
      .map(p => {
        const sold = billableSales
          .reduce((s, t) => s + (t.items?.filter(i => i.productId === p.id).reduce((is, i) => is + i.quantity, 0) || 0), 0);
        return { ...p, sold, revenue: sold * p.price };
      })
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);
  }, [products, billableSales]);

  // Top customers from filtered data
  const topCust = useMemo(() => {
    return [...customers]
      .map(c => {
        const total = billableSales
          .filter(t => t.customerId === c.id)
          .reduce((s, t) => s + t.total, 0);
        return { ...c, totalSales: total };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
  }, [customers, billableSales]);

  const statusCounts = {
    paid: filteredTransactions.filter(t => t.status === 'paid').length,
    pending: filteredTransactions.filter(t => t.status === 'pending').length,
    overdue: filteredTransactions.filter(t => t.status === 'overdue').length,
    cancelled: filteredTransactions.filter(t => t.status === 'cancelled').length,
  };

  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
  const totalEquity = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + a.balance, 0);

  const toggleSort = (by: 'date' | 'amount' | 'customer' | 'status') => {
    if (reportSortBy === by) {
      dispatch({ type: 'SET_REPORT_SORT', payload: { by, dir: reportSortDir === 'asc' ? 'desc' : 'asc' } });
    } else {
      dispatch({ type: 'SET_REPORT_SORT', payload: { by, dir: 'desc' } });
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (reportSortBy !== col) return <svg className="w-3 h-3 inline ml-1 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>;
    return reportSortDir === 'asc'
      ? <svg className="w-3 h-3 inline ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
      : <svg className="w-3 h-3 inline ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
  };

  // Generate plain text report for email/WhatsApp
  const generateReportText = () => {
    let text = `AFRITECX BADBOY - ${reportType.toUpperCase()} REPORT\n`;
    text += `Period: ${reportDateFrom} to ${reportDateTo}\n`;
    text += `Generated: ${new Date().toLocaleString('en-ZA')}\n\n`;
    text += `=== FINANCIAL SUMMARY ===\n`;
    text += `Total Revenue: R ${financials.revenue.toFixed(2)}\n`;
    text += `Cost of Goods Sold: R ${financials.cogs.toFixed(2)}\n`;
    text += `Gross Profit: R ${financials.grossProfit.toFixed(2)}\n`;
    text += `Gross Margin: ${financials.grossMargin.toFixed(1)}%\n`;
    text += `Operating Expenses: R ${financials.expenses.toFixed(2)}\n`;
    text += `Net Profit: R ${financials.netProfit.toFixed(2)}\n\n`;
    if (reportType === 'sales') {
      text += `=== TRANSACTIONS (${sortedTransactions.length}) ===\n`;
      sortedTransactions.forEach(t => {
        text += `${t.date} | ${t.type.toUpperCase()} | ${t.customerName || '-'} | R ${t.total.toFixed(2)} | ${t.status}\n`;
      });
      text += `\nTotal: R ${sortedTransactions.reduce((s, t) => s + t.total, 0).toFixed(2)}\n`;
    }
    if (reportType === 'products') {
      text += `=== TOP PRODUCTS ===\n`;
      topProducts.filter(p => p.sold > 0).forEach((p, i) => {
        text += `${i+1}. ${p.name} - ${p.sold} units - R ${p.revenue.toFixed(2)}\n`;
      });
    }
    if (reportType === 'customers') {
      text += `=== TOP CUSTOMERS ===\n`;
      topCust.filter(c => c.totalSales > 0).forEach((c, i) => {
        text += `${i+1}. ${c.name} - R ${c.totalSales.toFixed(2)}\n`;
      });
    }
    text += `\n---\nAfritecx Badboy Accounting & POS System`;
    return text;
  };

  // Generate HTML report for PDF/print
  const generateHTMLReport = () => {
    let html = `<!DOCTYPE html><html><head><title>Afritecx Badboy Report</title>`;
    html += `<style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
      h1 { color: #059669; border-bottom: 3px solid #059669; padding-bottom: 10px; }
      h2 { color: #334155; margin-top: 30px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; }
      td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
      .summary { display: flex; gap: 20px; margin: 20px 0; }
      .summary div { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; }
      .summary .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
      .summary .value { font-size: 20px; font-weight: bold; color: #059669; margin-top: 5px; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      .positive { color: #059669; } .negative { color: #dc2626; }
    </style></head><body>`;
    html += `<h1>Afritecx Badboy - ${reportType.toUpperCase()} REPORT</h1>`;
    html += `<p><strong>Period:</strong> ${reportDateFrom} to ${reportDateTo}<br/>`;
    html += `<strong>Generated:</strong> ${new Date().toLocaleString('en-ZA')}</p>`;
    html += `<div class="summary">`;
    html += `<div><div class="label">Revenue</div><div class="value">R ${financials.revenue.toFixed(2)}</div></div>`;
    html += `<div><div class="label">Gross Profit</div><div class="value">R ${financials.grossProfit.toFixed(2)}</div></div>`;
    html += `<div><div class="label">Net Profit</div><div class="value ${financials.netProfit >= 0 ? 'positive' : 'negative'}">R ${financials.netProfit.toFixed(2)}</div></div>`;
    html += `<div><div class="label">Margin</div><div class="value">${financials.grossMargin.toFixed(1)}%</div></div>`;
    html += `</div>`;
    if (reportType === 'sales') {
      html += `<h2>Transaction Details</h2><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Customer</th><th>Amount</th><th>Tax</th><th>Total</th><th>Status</th></tr></thead><tbody>`;
      sortedTransactions.forEach(t => {
        html += `<tr><td>${t.date}</td><td>${t.type}</td><td>${t.description}</td><td>${t.customerName || '-'}</td><td>R ${t.amount.toFixed(2)}</td><td>R ${t.tax.toFixed(2)}</td><td>R ${t.total.toFixed(2)}</td><td>${t.status}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (reportType === 'products') {
      html += `<h2>Top Products</h2><table><thead><tr><th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead><tbody>`;
      topProducts.filter(p => p.sold > 0).forEach((p, i) => {
        html += `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.sold}</td><td>R ${p.revenue.toFixed(2)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (reportType === 'customers') {
      html += `<h2>Top Customers</h2><table><thead><tr><th>#</th><th>Customer</th><th>Email</th><th>Total Sales</th></tr></thead><tbody>`;
      topCust.filter(c => c.totalSales > 0).forEach((c, i) => {
        html += `<tr><td>${i+1}</td><td>${c.name}</td><td>${c.email}</td><td>R ${c.totalSales.toFixed(2)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `<div class="footer">Afritecx Badboy Accounting & POS System · Generated ${new Date().toLocaleString('en-ZA')}</div>`;
    html += `</body></html>`;
    return html;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Customizable business performance analysis · Currency: ZAR (R)</p>
        </div>
        {/* Export / Share Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const body = generateReportText();
              window.location.href = `mailto:?subject=Afritecx Badboy Report&body=${encodeURIComponent(body)}`;
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
            title="Send via Email"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            Email
          </button>
          <button
            onClick={() => {
              const body = generateReportText();
              window.open(`https://wa.me/?text=${encodeURIComponent('Afritecx Badboy Report\n\n' + body)}`, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
            title="Share via WhatsApp"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            WhatsApp
          </button>
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(generateHTMLReport());
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 300);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            title="Save as PDF / Print"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            PDF
          </button>
        </div>
      </div>

      {/* Report Controls - Date Range & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Report Type Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['financial', 'sales', 'products', 'customers'] as const).map(r => (
              <button key={r} onClick={() => setReportType(r)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${reportType === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {r === 'financial' ? 'Financial' : r === 'sales' ? 'Sales Detail' : r === 'products' ? 'Products' : 'Customers'}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From:</label>
            <input type="date" value={reportDateFrom} onChange={e => dispatch({ type: 'SET_REPORT_DATE_FROM', payload: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            <label className="text-xs text-slate-500">To:</label>
            <input type="date" value={reportDateTo} onChange={e => dispatch({ type: 'SET_REPORT_DATE_TO', payload: e.target.value })}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Filters */}
          {reportType === 'financial' && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                Include Tax
              </label>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="all">All Periods</option>
                <option value="month">By Month</option>
                <option value="category">By Category</option>
              </select>
            </>
          )}
          {reportType === 'sales' && (
            <select value={saleTypeFilter} onChange={e => setSaleTypeFilter(e.target.value as any)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
              <option value="all">All Types</option>
              <option value="sale">Sales Only</option>
              <option value="expense">Expenses Only</option>
              <option value="payment">Payments Only</option>
            </select>
          )}
        </div>
      </div>

      {/* === FINANCIAL REPORT === */}
      {reportType === 'financial' && (
        <>
          {/* P&L Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Profit & Loss Statement
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({reportDateFrom || 'start'} to {reportDateTo || 'end'})
                </span>
              </h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${financials.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {financials.netProfit >= 0 ? 'Profitable' : 'Loss'}
              </span>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Revenue</span>
                <span className="font-semibold text-slate-800">{formatZAR(financials.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cost of Goods Sold</span>
                <span className="font-semibold text-slate-800">-{formatZAR(financials.cogs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Profit</span>
                <span className="text-emerald-600 font-bold">{formatZAR(financials.grossProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Margin</span>
                <span className="font-medium text-slate-800">{financials.grossMargin.toFixed(1)}%</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between">
                <span className="text-slate-600">Operating Expenses</span>
                <span className="font-semibold text-red-600">-{formatZAR(financials.expenses)}</span>
              </div>
              <div className="border-t-2 border-slate-200 pt-3 flex justify-between text-base">
                <span className="font-bold text-slate-800">Net Profit</span>
                <span className={`font-bold ${financials.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatZAR(financials.netProfit)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span>{filteredTransactions.filter(t => t.type === 'sale').length} sale(s)</span>
                <span>{filteredTransactions.filter(t => t.type === 'expense').length} expense(s)</span>
              </div>
            </div>
          </div>

          {/* Grouped breakdown */}
          {groupBy === 'month' && monthlyBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Month</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Revenue</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Expenses</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Net</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBreakdown.map(([month, data]) => {
                      const net = data.revenue - data.expenses;
                      return (
                        <tr key={month} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-medium text-slate-800">{month}</td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-medium">{formatZAR(data.revenue)}</td>
                          <td className="px-5 py-3 text-right text-red-600 font-medium">{formatZAR(data.expenses)}</td>
                          <td className={`px-5 py-3 text-right font-bold ${net >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatZAR(net)}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{data.count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {groupBy === 'category' && categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Category Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Units Sold</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Revenue</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Cost</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryBreakdown.map(([cat, data]) => {
                      const margin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0;
                      return (
                        <tr key={cat} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-medium text-slate-800">{cat}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{data.sold}</td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-medium">{formatZAR(data.revenue)}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{formatZAR(data.cost)}</td>
                          <td className="px-5 py-3 text-right font-medium">{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Two column bottom */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Transaction Status</h3>
              </div>
              <div className="p-5 space-y-4">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const pct = filteredTransactions.length > 0 ? (count / filteredTransactions.length) * 100 : 0;
                  const colors: Record<string, string> = {
                    paid: 'bg-emerald-500', pending: 'bg-amber-500', overdue: 'bg-red-500', cancelled: 'bg-slate-400',
                  };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-slate-600">{status}</span>
                        <span className="font-medium text-slate-800">{count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Balance Sheet */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Balance Sheet Summary</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Total Assets</span><span className="font-bold text-blue-600">{formatZAR(totalAssets)}</span></div>
                <div className="border-t pt-3 flex justify-between"><span className="text-slate-600">Total Liabilities</span><span className="font-bold text-amber-600">{formatZAR(totalLiabilities)}</span></div>
                <div className="border-t pt-3 flex justify-between"><span className="text-slate-600">Total Equity</span><span className="font-bold text-purple-600">{formatZAR(totalEquity)}</span></div>
                <div className="border-t-2 pt-3 flex justify-between text-base"><span className="font-bold text-slate-800">Liabilities + Equity</span><span className="font-bold text-slate-800">{formatZAR(totalLiabilities + totalEquity)}</span></div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* === SALES DETAIL REPORT === */}
      {reportType === 'sales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Transaction Details
              <span className="ml-2 text-xs font-normal text-slate-400">({sortedTransactions.length} records)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-800" onClick={() => toggleSort('date')}>
                    Date <SortIcon col="date" />
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-800" onClick={() => toggleSort('customer')}>
                    Customer <SortIcon col="customer" />
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-800" onClick={() => toggleSort('amount')}>
                    Amount <SortIcon col="amount" />
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Tax</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-800" onClick={() => toggleSort('amount')}>
                    Total <SortIcon col="amount" />
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-800" onClick={() => toggleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-600">{t.date}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium capitalize ${t.type === 'sale' ? 'text-emerald-600' : t.type === 'expense' ? 'text-amber-600' : t.type === 'payment' ? 'text-blue-600' : 'text-red-600'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-[200px] truncate">{t.description}</td>
                    <td className="px-5 py-3 text-slate-600">{t.customerName || '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatZAR(t.amount)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatZAR(t.tax)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatZAR(t.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        t.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <td colSpan={4} className="px-5 py-3 text-sm text-slate-800">Totals</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatZAR(sortedTransactions.reduce((s, t) => s + t.amount, 0))}</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatZAR(sortedTransactions.reduce((s, t) => s + t.tax, 0))}</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatZAR(sortedTransactions.reduce((s, t) => s + t.total, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {sortedTransactions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="font-medium">No transactions in selected date range</p>
            </div>
          )}
        </div>
      )}

      {/* === PRODUCTS REPORT === */}
      {reportType === 'products' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-medium">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-medium">In Stock</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{products.filter(p => p.stock >= 20).length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-medium">Low / Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{products.filter(p => p.stock < 20).length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Top Selling Products (Filtered Period)</h3>
            </div>
            <div className="p-5 space-y-3">
              {topProducts.filter(p => p.sold > 0).map((p, i) => {
                const margin = p.price > 0 ? ((p.price - (products.find(pp => pp.id === p.id)?.cost || 0)) / p.price * 100) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-slate-400">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sold} units · {formatZAR(p.revenue)} revenue</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${margin >= 40 ? 'bg-emerald-100 text-emerald-700' : margin >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {margin.toFixed(1)}% margin
                    </span>
                  </div>
                );
              })}
              {topProducts.filter(p => p.sold > 0).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No sales in selected period</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* === CUSTOMERS REPORT === */}
      {reportType === 'customers' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-medium">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-medium">Active Buyers (Period)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{topCust.filter(c => c.totalSales > 0).length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-medium">Total Receivables</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(customers.reduce((s, c) => s + c.balance, 0))}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Customer Sales (Filtered Period)</h3>
            </div>
            <div className="p-5 space-y-3">
              {topCust.filter(c => c.totalSales > 0).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-slate-400">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email} · Balance: {formatZAR(c.balance)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{formatZAR(c.totalSales)}</span>
                </div>
              ))}
              {topCust.filter(c => c.totalSales > 0).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No customer purchases in selected period</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Inventory Status (shown for all report types) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Inventory Status</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{products.filter(p => p.stock >= 20).length}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">In Stock</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{products.filter(p => p.stock > 0 && p.stock < 20).length}</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Low Stock</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{products.filter(p => p.stock === 0).length}</p>
              <p className="text-xs text-red-600 font-medium mt-1">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
