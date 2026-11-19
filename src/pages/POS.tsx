import { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { PaymentMethod, Transaction } from '../types';
import { formatZAR } from '../utils/currency';
import { computeCartTotals, statusForPaymentMethod } from '../utils/sales';
import { localDate, localTime } from '../utils/datetime';
import { makeId } from '../utils/ids';

export default function POS() {
  const { state, dispatch } = useApp();
  const { products, cart, customers } = state;
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>('cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Handle barcode scan submission
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scanned = barcodeInput.trim();
    if (!scanned) return;

    const found = products.find(p => p.barcode === scanned);
    if (found) {
      dispatch({ type: 'ADD_TO_CART', payload: found });
      setBarcodeInput('');
      // Short success flash effect
      if (barcodeRef.current) {
        barcodeRef.current.style.borderColor = '#10b981';
        setTimeout(() => {
          if (barcodeRef.current) barcodeRef.current.style.borderColor = '';
        }, 300);
      }
    } else {
      // Flash red for not found
      if (barcodeRef.current) {
        barcodeRef.current.style.borderColor = '#ef4444';
        setTimeout(() => {
          if (barcodeRef.current) barcodeRef.current.style.borderColor = '';
        }, 500);
      }
      setBarcodeInput('');
    }
  };

  // Auto-focus barcode input when in barcode mode
  useEffect(() => {
    if (barcodeMode && barcodeRef.current) {
      barcodeRef.current.focus();
    } else if (!barcodeMode && searchRef.current) {
      searchRef.current.focus();
    }
  }, [barcodeMode]);

  // Listen for global keyboard shortcut (Ctrl+B or F2) to toggle barcode mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'b') || e.key === 'F2') {
        e.preventDefault();
        setBarcodeMode(prev => !prev);
      }
      if (e.key === 'Escape') {
        setBarcodeMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  // VAT is per line: a basket mixing 0%-rated and 15% items must not be averaged.
  const { subtotal, tax, total } = computeCartTotals(cart);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    // A credit sale must be raised as pending so it lands in receivables, and it
    // must be tied to a customer account or the debt cannot be collected.
    if (paymentMethod === 'credit' && !selectedCustomer) return;

    const transaction: Transaction = {
      id: makeId('t'),
      date: localDate(),
      time: localTime(),
      type: 'sale',
      description: `POS Sale - ${cart.length} item(s)`,
      customerId: selectedCustomer || undefined,
      customerName: selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : undefined,
      amount: subtotal,
      tax: tax,
      total: total,
      paymentMethod,
      status: statusForPaymentMethod(paymentMethod),
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
    };
    setLastPaymentMethod(paymentMethod);
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    setLastTransaction(transaction);
    setShowReceipt(true);
    dispatch({ type: 'CLEAR_CART' });
  };

  const handleNewSale = () => {
    setShowReceipt(false);
    setLastTransaction(null);
    setSelectedCustomer('');
    setPaymentMethod('cash');
    setBarcodeMode(false);
  };

  if (showReceipt && lastTransaction) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Payment Successful</h2>
            <p className="text-sm text-slate-500">Transaction completed</p>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Company</span>
              <span className="font-medium text-slate-800">{state.businessProfile.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice #</span>
              <span className="font-medium text-slate-800">{state.businessProfile.invoicePrefix}{lastTransaction.id || 'POS'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-800">{lastTransaction.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment</span>
              <span className="font-medium text-slate-800 capitalize">{lastPaymentMethod}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 mt-4 pt-4">
            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Items</h4>
            {lastTransaction.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-slate-700">{item.productName} x{item.quantity}</span>
                <span className="font-medium text-slate-800">{formatZAR(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatZAR(lastTransaction.amount)}</span></div>
            <div className="flex justify-between text-slate-500"><span>VAT</span><span>{formatZAR(lastTransaction.tax)}</span></div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total (ZAR)</span><span>{formatZAR(lastTransaction.total)}</span>
            </div>
          </div>
          {state.businessProfile.receiptFooter && (
            <p className="mt-4 pt-3 border-t border-dashed border-slate-200 text-center text-xs text-slate-400">
              {state.businessProfile.receiptFooter}
            </p>
          )}
        </div>

        <button
          onClick={handleNewSale}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
        >
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Products Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{state.businessProfile.terminology.posTitle}</h1>
            <button
              onClick={() => setBarcodeMode(!barcodeMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                barcodeMode
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle barcode scanner (Ctrl+B / F2)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4v16M6 4v16M10 4v16M14 4v16M18 4v16M22 4v16" />
              </svg>
              {barcodeMode ? 'Scanner Active' : 'Barcode'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Barcode Scanner Input */}
            {barcodeMode && (
              <form onSubmit={handleBarcodeSubmit} className="relative animate-in slide-in-from-right">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4v4M6 4v4M10 4v4M14 4v4M18 4v4M22 4v4M2 20v-4M6 20v-4M10 20v-4M14 20v-4M18 20v-4M22 20v-4" />
                </svg>
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scan barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onBlur={() => barcodeMode && barcodeRef.current?.focus()}
                  className="pl-10 pr-10 py-2 border-2 border-emerald-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56 bg-emerald-50/50"
                  autoFocus
                />
                {barcodeInput && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-500 rounded flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                )}
              </form>
            )}
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => dispatch({ type: 'ADD_TO_CART', payload: product })}
              disabled={product.stock === 0}
              className={`relative bg-white rounded-xl border border-slate-200 p-4 text-left transition-all hover:shadow-md hover:border-emerald-300 active:scale-[0.98] ${
                product.stock === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-0.5">{product.code}</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight mb-1">{product.name}</p>
              <p className="text-sm font-bold text-emerald-600">{formatZAR(product.price)}</p>
              {product.stock < 10 && product.stock > 0 && (
                <span className="absolute top-2 right-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {product.stock} left
                </span>
              )}
              {product.stock === 0 && (
                <span className="absolute top-2 right-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                  Out
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Area */}
      <div className="w-full lg:w-96 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sticky top-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Cart Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Current Sale
                {cart.length > 0 && <span className="ml-2 text-xs text-slate-400">({cart.length} items)</span>}
              </h2>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-[200px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 text-slate-400">
                <svg className="w-12 h-12 mb-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                </svg>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Click on products to add them</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-400">{formatZAR(item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { productId: item.product.id, quantity: item.quantity - 1 } })}
                      className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { productId: item.product.id, quantity: item.quantity + 1 } })}
                      className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-sm font-semibold text-slate-800">{formatZAR(item.product.price * item.quantity)}</p>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item.product.id })}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Totals */}
          <div className="px-5 py-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatZAR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>VAT</span>
              <span>{formatZAR(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>{formatZAR(total)}</span>
            </div>

            {/* Payment Method */}
            <div className="flex gap-2 pt-2">
              {(['cash', 'card', 'credit'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    paymentMethod === method
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {method === 'cash' ? '💵 Cash' : method === 'card' ? '💳 Card' : '📄 Credit'}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => dispatch({ type: 'CLEAR_CART' })}
                disabled={cart.length === 0}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="flex-[2] py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Pay {formatZAR(total)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
