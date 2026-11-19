import { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { formatZAR } from '../utils/currency';
import { Page } from '../types';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

const QUICK_PROMPTS = [
  'Analyze profit, revenue & VAT (ZAR)',
  'Which items are low on stock?',
  'List overdue invoices & debtors',
  'Summarize monthly payroll & PAYE',
  'Back up the SQL database now',
  'Customize app for my industry',
];

export default function AIAssistant() {
  const { state, dispatch } = useApp();
  const {
    aiOpen,
    products,
    customers,
    transactions,
    accounts,
    employees,
    shifts,
    businessProfile,
    snapshots,
  } = state;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Sawubona / Hello! I'm your **${businessProfile.companyName} AI Copilot**. I have live access to your ZAR accounting ledger, POS inventory, payroll, and SQL database. How can I help your business today?`,
      timestamp: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_AI' });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatch]);

  const navigateTo = (page: Page) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  };

  const generateAIResponse = (query: string): Omit<ChatMessage, 'id' | 'timestamp'> => {
    const q = query.toLowerCase();

    const totalRevenue = transactions
      .filter(t => t.type === 'sale')
      .reduce((s, t) => s + t.total, 0);
    const totalVat = transactions
      .filter(t => t.type === 'sale')
      .reduce((s, t) => s + t.tax, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.total, 0);
    const netProfit = totalRevenue - totalExpenses;
    const lowStock = products.filter(p => p.stock < 20);
    const overdueTx = transactions.filter(t => t.status === 'overdue' || t.status === 'pending');

    if (q.includes('stock') || q.includes('inventory') || q.includes('product')) {
      const restockCost = lowStock.reduce((s, p) => s + p.cost * (30 - p.stock), 0);
      const list = lowStock
        .slice(0, 5)
        .map(p => `• ${p.name} (${p.code}): ${p.stock} left @ ${formatZAR(p.price)}`)
        .join('\n');
      return {
        sender: 'ai',
        text:
          lowStock.length > 0
            ? `You currently have **${lowStock.length} low-stock ${businessProfile.terminology.productPlural.toLowerCase()}** (< 20 units):\n\n${list}\n\nEstimated cost to restock each to 30 units: **${formatZAR(restockCost)}**.`
            : `All ${products.length} ${businessProfile.terminology.productPlural.toLowerCase()} are well stocked (≥ 20 units)! Total inventory retail value is **${formatZAR(products.reduce((s, p) => s + p.price * p.stock, 0))}**.`,
        actionButton: {
          label: `Open ${businessProfile.terminology.productPlural}`,
          onClick: () => navigateTo('products'),
        },
      };
    }

    if (q.includes('overdue') || q.includes('invoice') || q.includes('debtor') || q.includes('customer') || q.includes('receivable')) {
      const totalOutstanding = overdueTx.reduce((s, t) => s + t.total, 0);
      const list = overdueTx
        .slice(0, 4)
        .map(t => `• ${t.customerName || 'Walk-in'} — ${formatZAR(t.total)} (${t.status.toUpperCase()} on ${t.date})`)
        .join('\n');
      return {
        sender: 'ai',
        text: `You have **${overdueTx.length} unpaid/overdue invoices** totaling **${formatZAR(totalOutstanding)}**:\n\n${list || 'None'}\n\nTotal customer account balances across ${customers.length} clients: **${formatZAR(customers.reduce((s, c) => s + c.balance, 0))}**.`,
        actionButton: {
          label: 'View Sales & Invoices',
          onClick: () => navigateTo('invoices'),
        },
      };
    }

    if (q.includes('payroll') || q.includes('salary') || q.includes('employee') || q.includes('paye')) {
      const activeEmps = employees.filter(e => e.status === 'active');
      const grossPayroll = activeEmps.reduce((s, e) => s + e.salary, 0);
      return {
        sender: 'ai',
        text: `**Payroll Summary (ZAR):**\n• Active Employees: **${activeEmps.length}**\n• Monthly Gross Salaries: **${formatZAR(grossPayroll)}**\n• Estimated SARS PAYE + UIF deductions are automatically calculated in the Payroll Manager.`,
        actionButton: {
          label: 'Open Payroll Manager',
          onClick: () => navigateTo('payroll'),
        },
      };
    }

    if (q.includes('backup') || q.includes('sql') || q.includes('database') || q.includes('restore')) {
      dispatch({
        type: 'CREATE_SNAPSHOT',
        payload: { name: `AI Auto-Backup (${new Date().toLocaleTimeString('en-ZA')})` },
      });
      return {
        sender: 'ai',
        text: `I have just created an instant **SQL Database Snapshot** for you! You now have **${snapshots.length + 1} saved snapshots** in persistent storage.\n\nYou can also download a `.concat(
          '`.sql` relational dump or `.json` archive, or run live `SELECT` queries in the SQL Database Studio.'
        ),
        actionButton: {
          label: 'Open SQL Database Studio',
          onClick: () => navigateTo('database'),
        },
      };
    }

    if (q.includes('industry') || q.includes('custom') || q.includes('business') || q.includes('setting')) {
      return {
        sender: 'ai',
        text: `Your system is currently configured for **${businessProfile.companyName}** (${businessProfile.industry.toUpperCase()}).\n\nYou can switch between **8 industry presets** (Retail, Restaurant, Hardware, Pharmacy, Salon, Automotive, Electronics, General) or customize every module label and SARS VAT setting.`,
        actionButton: {
          label: 'Open Industry Customizer',
          onClick: () => navigateTo('settings'),
        },
      };
    }

    if (q.includes('shift') || q.includes('cash') || q.includes('till') || q.includes('reconcil')) {
      const openShift = shifts.find(s => s.status === 'open');
      return {
        sender: 'ai',
        text: openShift
          ? `**Active Shift:** ${openShift.userName} opened a shift at ${new Date(openShift.openedAt).toLocaleTimeString('en-ZA')} with float **${formatZAR(openShift.openingCash)}** and **${formatZAR(openShift.totalSales)}** in recorded sales.`
          : `There are currently **no open shifts**. Open a new shift with a ZAR cash float before processing till sales.`,
        actionButton: {
          label: 'Manage Shifts & Cash',
          onClick: () => navigateTo('shifts'),
        },
      };
    }

    // Default: Financial & VAT Analysis
    const cashBank = accounts.find(a => a.code === '1000')?.balance || 0;
    return {
      sender: 'ai',
      text:
        `**Live Financial Snapshot (${businessProfile.companyName} — ZAR):**\n` +
        `• Total Sales Revenue: **${formatZAR(totalRevenue)}**\n` +
        `• Operating Expenses: **${formatZAR(totalExpenses)}**\n` +
        `• Net Profit: **${formatZAR(netProfit)}**\n` +
        `• Output VAT (${businessProfile.defaultVatRate}%): **${formatZAR(totalVat)}**\n` +
        `• Cash at Bank (Acct 1000): **${formatZAR(cashBank)}**`,
      actionButton: {
        label: 'Open Detailed Reports',
        onClick: () => navigateTo('reports'),
      },
    };
  };

  const handleSend = (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    };

    const replyData = generateAIResponse(text);
    const aiMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      timestamp: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      ...replyData,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    if (!promptText) setInput('');
  };

  return (
    <>
      {/* Floating AI Launcher Button */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_AI' })}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-900/25 transition-all hover:scale-105"
        title="Open Badboy AI Assistant (Ctrl+K)"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
          <path d="M9 17h6" />
        </svg>
        <span className="text-xs font-bold tracking-wide">Badboy AI</span>
      </button>

      {/* Slide-over AI Assistant Panel */}
      {aiOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden" style={{ height: '540px' }}>
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Afritecx Badboy AI</h3>
                <p className="text-[10px] text-emerald-400">Live Accounting, POS & SQL Copilot (ZAR)</p>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_AI', payload: false })}
              className="text-slate-400 hover:text-white p-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text.split('**').map((part, i) =>
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                  )}
                  {msg.actionButton && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={msg.actionButton.onClick}
                        className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1"
                      >
                        <span>{msg.actionButton.label}</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map(qp => (
              <button
                key={qp}
                onClick={() => handleSend(qp)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-medium whitespace-nowrap transition-colors"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about ZAR sales, stock, VAT, SQL backup..."
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
