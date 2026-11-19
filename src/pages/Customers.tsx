import { useState } from 'react';
import { useApp } from '../store';
import { Customer } from '../types';
import { formatZAR } from '../utils/currency';

export default function Customers() {
  const { state, dispatch } = useApp();
  const { customers, transactions } = state;
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ code: '', name: '', email: '', phone: '', address: '', creditLimit: 0, balance: 0 });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', name: '', email: '', phone: '', address: '', creditLimit: 0, balance: 0 });
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, email: c.email, phone: c.phone, address: c.address, creditLimit: c.creditLimit, balance: c.balance });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.code) return;
    if (editing) {
      dispatch({ type: 'UPDATE_CUSTOMER', payload: { ...editing, ...form } });
    } else {
      dispatch({ type: 'ADD_CUSTOMER', payload: form as Customer });
    }
    setShowForm(false);
    setEditing(null);
  };

  const getCustomerTotal = (custId: string) => {
    return transactions.filter(t => t.customerId === custId && t.type === 'sale').reduce((s, t) => s + t.total, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{state.businessProfile.terminology.customerPlural}</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your {state.businessProfile.terminology.customerPlural.toLowerCase()} & credit accounts in ZAR</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add {state.businessProfile.terminology.customerSingular}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Outstanding</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(customers.reduce((s, c) => s + c.balance, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Credit Limit</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(customers.reduce((s, c) => s + c.creditLimit, 0))}</p>
        </div>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full max-w-md" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Code</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Balance</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Credit Limit</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Total Sales</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const creditUsed = (c.balance / c.creditLimit) * 100;
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-slate-500">{c.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-5 py-3 text-slate-600">{c.email}</td>
                    <td className="px-5 py-3 text-slate-600">{c.phone}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatZAR(c.balance)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-600">{formatZAR(c.creditLimit)}</span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className={`h-full rounded-full ${creditUsed > 80 ? 'bg-red-500' : creditUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(creditUsed, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatZAR(getCustomerTotal(c.id))}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Edit">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => dispatch({ type: 'DELETE_CUSTOMER', payload: c.id })} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="font-medium">No customers found</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editing ? 'Edit Customer' : 'Add Customer'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Credit Limit</label>
                <input type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Opening Balance</label>
                <input type="number" step="0.01" value={form.balance} onChange={e => setForm({...form, balance: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
