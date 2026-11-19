import { useState } from 'react';
import { useApp } from '../store';
import { Product } from '../types';
import { formatZAR } from '../utils/currency';

export default function Products() {
  const { state, dispatch } = useApp();
  const { products } = state;
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '', category: '', price: 0, cost: 0, stock: 0, taxRate: 15, barcode: '' });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const openNew = () => {
    setEditingProduct(null);
    setForm({ code: '', name: '', description: '', category: '', price: 0, cost: 0, stock: 0, taxRate: 15, barcode: '' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ code: p.code, name: p.name, description: p.description, category: p.category, price: p.price, cost: p.cost, stock: p.stock, taxRate: p.taxRate, barcode: p.barcode || '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.code) return;
    if (editingProduct) {
      dispatch({ type: 'UPDATE_PRODUCT', payload: { ...editingProduct, ...form } });
    } else {
      dispatch({ type: 'ADD_PRODUCT', payload: form as Product });
    }
    setShowForm(false);
    setEditingProduct(null);
  };

  const totalValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const totalRetail = products.reduce((s, p) => s + p.price * p.stock, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{state.businessProfile.terminology.productPlural}</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your catalog and stock levels in ZAR ({state.businessProfile.companyName})</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add {state.businessProfile.terminology.productSingular}
        </button>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Products</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Inventory Value (Cost)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Retail Value</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(totalRetail)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full max-w-md" />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Code</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Barcode</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Cost</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Margin</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Stock</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const margin = ((p.price - p.cost) / p.price * 100);
                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-slate-500">{p.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-3"><span className="text-xs font-mono text-slate-500">{p.barcode || '-'}</span></td>
                    <td className="px-5 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.category}</span></td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatZAR(p.cost)}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{formatZAR(p.price)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-medium ${margin >= 40 ? 'text-emerald-600' : margin >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-medium ${p.stock < 10 ? 'text-red-600' : p.stock < 20 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Edit">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => dispatch({ type: 'DELETE_PRODUCT', payload: p.id })} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
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
            <p className="font-medium">No products found</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tax Rate (%)</label>
                <input type="number" value={form.taxRate} onChange={e => setForm({...form, taxRate: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Barcode</label>
                <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 4901234567890" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cost Price</label>
                <input type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Selling Price</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Stock Quantity</label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
