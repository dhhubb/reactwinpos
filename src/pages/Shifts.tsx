import { useState } from 'react';
import { useApp } from '../store';
import { Shift, CashDenomination } from '../types';
import { formatZAR } from '../utils/currency';
import { computeShiftTotals, countDenominations, ZAR_DENOMINATIONS } from '../utils/shift';
import { localDateTime } from '../utils/datetime';

export default function Shifts() {
  const { state, dispatch } = useApp();
  const { shifts, currentUser, transactions } = state;
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingShift, setClosingShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState(0);

  // Cash reconciliation form
  const emptyDenominations = (): CashDenomination[] =>
    ZAR_DENOMINATIONS.map(denomination => ({ denomination, count: 0 }));
  const [denominations, setDenominations] = useState<CashDenomination[]>(emptyDenominations);
  const [closingNotes, setClosingNotes] = useState('');

  const openShifts = shifts.filter(s => s.status === 'open');
  const closedShifts = shifts.filter(s => s.status === 'closed');

  const handleOpenShift = () => {
    if (!currentUser) return;
    const shift: Shift = {
      id: '',
      userId: currentUser.id,
      userName: currentUser.fullName,
      openedAt: localDateTime(),
      openingCash: Math.max(0, openingCash),
      status: 'open',
      transactionCount: 0,
      totalSales: 0,
    };
    dispatch({ type: 'ADD_SHIFT', payload: shift });
    setOpeningCash(0);
    setShowOpenForm(false);
  };

  const handleCountChange = (denom: number, count: number) => {
    setDenominations(prev => prev.map(d => d.denomination === denom ? { ...d, count: Math.max(0, count) } : d));
  };

  const countedCash = countDenominations(denominations);

  // Expected cash must only include cash takings made inside this shift's window.
  const shiftTotals = (shift: Shift) =>
    computeShiftTotals(transactions, shift, t => t.paymentMethod ?? 'cash');

  const handleCloseShift = () => {
    if (!closingShift) return;
    const { transactionCount, totalSales, expectedCash } = shiftTotals(closingShift);
    const difference = Math.round((countedCash - expectedCash) * 100) / 100;

    const updated: Shift = {
      ...closingShift,
      closedAt: localDateTime(),
      closingCash: countedCash,
      expectedCash,
      countedCash,
      difference,
      status: 'closed',
      transactionCount,
      totalSales,
      notes: closingNotes,
    };
    dispatch({ type: 'UPDATE_SHIFT', payload: updated });
    setShowCloseForm(false);
    setClosingShift(null);
    setClosingNotes('');
    setDenominations(emptyDenominations());
  };

  const statusColor = (status: string) =>
    status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift Management</h1>
          <p className="text-sm text-slate-500 mt-1">Open/close shifts and reconcile cash</p>
        </div>
        <button
          onClick={() => setShowOpenForm(true)}
          disabled={openShifts.some(s => s.userId === currentUser?.id)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
          title={openShifts.some(s => s.userId === currentUser?.id) ? 'You already have an open shift' : 'Open new shift'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Open Shift
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Open Shifts</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{openShifts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Closed Shifts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{closedShifts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Sales (Closed)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(closedShifts.reduce((s, sh) => s + sh.totalSales, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Cash Differences</p>
          <p className={`text-2xl font-bold mt-1 ${closedShifts.some(s => s.difference && s.difference !== 0) ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatZAR(closedShifts.reduce((s, sh) => s + (sh.difference || 0), 0))}
          </p>
        </div>
      </div>

      {/* Open Shifts */}
      {openShifts.length > 0 && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm">
          <div className="px-5 py-3 border-b border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-700">Currently Open</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {openShifts.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.userName}</p>
                  <p className="text-xs text-slate-400">Opened: {new Date(s.openedAt).toLocaleString('en-ZA')} · Opening cash: {formatZAR(s.openingCash)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{s.transactionCount} sales · {formatZAR(s.totalSales)}</span>
                  <button
                    onClick={() => { setClosingShift(s); setShowCloseForm(true); }}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Close & Reconcile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed Shifts */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Shift History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Opened</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Closed</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Opening</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Sales</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Expected</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Counted</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Difference</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {closedShifts.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.userName}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{new Date(s.openedAt).toLocaleString('en-ZA')}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{s.closedAt ? new Date(s.closedAt).toLocaleString('en-ZA') : '-'}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatZAR(s.openingCash)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatZAR(s.totalSales)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatZAR(s.expectedCash || 0)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatZAR(s.countedCash || 0)}</td>
                  <td className={`px-5 py-3 text-right font-medium ${
                    (s.difference || 0) === 0 ? 'text-emerald-600' : (s.difference || 0) > 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {s.difference !== undefined ? (s.difference > 0 ? '+' : '') + formatZAR(s.difference) : '-'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {closedShifts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="font-medium">No closed shifts yet</p>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      {showOpenForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowOpenForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Open New Shift</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
                  {currentUser?.fullName.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{currentUser?.fullName}</p>
                  <p className="text-xs text-slate-400">{currentUser?.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Opening Cash (Float)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={e => setOpeningCash(+e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-400 mt-1">Initial cash float in the register</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowOpenForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleOpenShift} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Open Shift</button>
            </div>
          </div>
        </div>
      )}

      {/* Close & Reconcile Modal */}
      {showCloseForm && closingShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto p-4" onClick={() => setShowCloseForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 my-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Close Shift & Cash Reconciliation</h3>
            <p className="text-sm text-slate-500 mb-4">{closingShift.userName} · Opened {new Date(closingShift.openedAt).toLocaleString('en-ZA')}</p>

            {/* Shift Summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Opening Cash</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{formatZAR(closingShift.openingCash)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Sales (This Shift)</p>
                <p className="text-sm font-bold text-emerald-600 mt-1">
                  {formatZAR(shiftTotals(closingShift).totalSales)}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-emerald-600">Expected Cash</p>
                <p className="text-sm font-bold text-emerald-700 mt-1">
                  {formatZAR(shiftTotals(closingShift).expectedCash)}
                </p>
              </div>
            </div>

            {/* Cash Denomination Counter */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Count Cash in Register</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {denominations.map(d => (
                  <div key={d.denomination} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <span className="text-xs font-medium text-slate-600 w-12">R{d.denomination.toFixed(2)}</span>
                    <input
                      type="number"
                      value={d.count}
                      onChange={e => handleCountChange(d.denomination, +e.target.value)}
                      className="w-14 border border-slate-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      min="0"
                    />
                    <span className="text-xs text-slate-400 w-14 text-right">R{(d.denomination * d.count).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between items-center px-4 py-3 bg-emerald-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Total Counted</span>
                <span className="text-lg font-bold text-emerald-700">{formatZAR(countedCash)}</span>
              </div>
              <div className="mt-2 flex justify-between items-center px-4 py-2 bg-slate-50 rounded-lg">
                <span className="text-xs font-medium text-slate-600">Variance vs expected</span>
                <span className={`text-sm font-bold ${Math.abs(countedCash - shiftTotals(closingShift).expectedCash) < 0.01 ? 'text-slate-600' : 'text-red-600'}`}>
                  {formatZAR(countedCash - shiftTotals(closingShift).expectedCash)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Discrepancies</label>
              <textarea
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="Any notes about this shift..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCloseForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleCloseShift} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">Close Shift</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
