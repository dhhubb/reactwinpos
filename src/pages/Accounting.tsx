import { useState } from 'react';
import { useApp } from '../store';
import { formatZAR } from '../utils/currency';
import { buildTrialBalance, buildJournalEntry, normalSide } from '../utils/ledger';
import { localDate } from '../utils/datetime';

export default function Accounting() {
  const { state, dispatch } = useApp();
  const { accounts, journalEntries } = state;
  const [tab, setTab] = useState<'chart' | 'trial' | 'journal'>('chart');
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalForm, setJournalForm] = useState({
    date: localDate(),
    description: '',
    reference: '',
    debitAccount: '',
    creditAccount: '',
    amount: 0,
  });

  // Each account is reported on its own normal side, so an over-drawn bank account
  // or a debit-balance liability is not silently dropped from the totals.
  const trialBalance = buildTrialBalance(accounts);
  const { totalDebits, totalCredits, difference, rows: trialRows } = trialBalance;

  const typeColors: Record<string, string> = {
    asset: 'text-blue-600 bg-blue-50',
    liability: 'text-amber-600 bg-amber-50',
    equity: 'text-purple-600 bg-purple-50',
    revenue: 'text-emerald-600 bg-emerald-50',
    expense: 'text-red-600 bg-red-50',
  };

  const [formError, setFormError] = useState('');

  const handleJournalSubmit = () => {
    const result = buildJournalEntry(
      {
        id: `JE-${Date.now().toString(36).toUpperCase()}`,
        date: journalForm.date,
        reference: journalForm.reference,
        description: journalForm.description,
        debitAccountId: journalForm.debitAccount,
        creditAccountId: journalForm.creditAccount,
        amount: journalForm.amount,
      },
      accounts
    );

    if (!result.ok || !result.entry) {
      // Surface the reason instead of silently doing nothing.
      setFormError(result.error ?? 'Could not post this entry.');
      return;
    }

    dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: result.entry });
    setShowJournalForm(false);
    setFormError('');
    setJournalForm({ date: localDate(), description: '', reference: '', debitAccount: '', creditAccount: '', amount: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounting</h1>
          <p className="text-sm text-slate-500 mt-1">Chart of Accounts, Trial Balance & Journal Entries</p>
        </div>
        <button onClick={() => setShowJournalForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Journal Entry
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['chart', 'trial', 'journal'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
            tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
            {t === 'chart' ? 'Chart of Accounts' : t === 'trial' ? 'Trial Balance' : 'Journal Entries'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'chart' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Account Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Balance</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Normal Side</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-slate-500">{a.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{a.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[a.type] || 'bg-slate-100 text-slate-600'}`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">
                      {formatZAR(a.balance)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-medium ${normalSide(a.type) === 'debit' ? 'text-blue-600' : 'text-amber-600'}`}>
                        {normalSide(a.type) === 'debit' ? 'Debit' : 'Credit'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'trial' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Trial Balance</h3>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${Math.abs(difference) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {Math.abs(difference) < 0.01 ? 'Balanced' : `Difference: ${formatZAR(difference)}`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Account</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Debit</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trialRows.map(({ account, debit, credit }) => (
                  <tr key={account.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-slate-500">{account.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{account.name}</td>
                    <td className="px-5 py-3 text-right text-slate-800">
                      {debit ? formatZAR(debit) : '-'}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-800">
                      {credit ? formatZAR(credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                  <td colSpan={2} className="px-5 py-3 text-sm text-slate-800">Totals</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatZAR(totalDebits)}</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatZAR(totalCredits)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {tab === 'journal' && (
        <div className="space-y-4">
          {journalEntries.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <p className="font-medium">No journal entries yet</p>
            </div>
          ) : (
            journalEntries.map(je => (
              <div key={je.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400 mr-3">{je.reference}</span>
                    <span className="text-sm font-semibold text-slate-800">{je.description}</span>
                  </div>
                  <span className="text-xs text-slate-400">{je.date}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-5 py-2 text-xs font-medium text-slate-500 uppercase">Account</th>
                        <th className="text-right px-5 py-2 text-xs font-medium text-slate-500 uppercase">Debit</th>
                        <th className="text-right px-5 py-2 text-xs font-medium text-slate-500 uppercase">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {je.debits.map((d, i) => (
                        <tr key={`d-${i}`} className="border-b border-slate-50">
                          <td className="px-5 py-2 text-slate-800">{d.accountName}</td>
                          <td className="px-5 py-2 text-right text-slate-800">{formatZAR(d.amount)}</td>
                          <td className="px-5 py-2 text-right text-slate-400">-</td>
                        </tr>
                      ))}
                      {je.credits.map((c, i) => (
                        <tr key={`c-${i}`} className="border-b border-slate-50">
                          <td className="px-5 py-2 text-slate-800">{c.accountName}</td>
                          <td className="px-5 py-2 text-right text-slate-400">-</td>
                          <td className="px-5 py-2 text-right text-slate-800">{formatZAR(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Journal Entry Modal */}
      {showJournalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowJournalForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">New Journal Entry</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <input type="date" value={journalForm.date} onChange={e => setJournalForm({...journalForm, date: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reference</label>
                  <input type="text" value={journalForm.reference} onChange={e => setJournalForm({...journalForm, reference: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="JE-2025-001" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input type="text" value={journalForm.description} onChange={e => setJournalForm({...journalForm, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Description of the transaction" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Debit Account</label>
                  <select value={journalForm.debitAccount} onChange={e => setJournalForm({...journalForm, debitAccount: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select account</option>
                    {accounts.filter(a => a.type === 'asset' || a.type === 'expense').map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Credit Account</label>
                  <select value={journalForm.creditAccount} onChange={e => setJournalForm({...journalForm, creditAccount: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select account</option>
                    {accounts.filter(a => a.type === 'liability' || a.type === 'equity' || a.type === 'revenue').map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
                <input type="number" step="0.01" value={journalForm.amount} onChange={e => setJournalForm({...journalForm, amount: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
              </div>
            </div>
            {formError && (
              <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowJournalForm(false); setFormError(''); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleJournalSubmit} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">Post Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
