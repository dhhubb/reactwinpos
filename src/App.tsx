import { AppProvider, useApp } from './store';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Accounting from './pages/Accounting';
import Reports from './pages/Reports';
import Shifts from './pages/Shifts';
import Payroll from './pages/Payroll';
import Users from './pages/Users';
import DatabaseBackup from './pages/DatabaseBackup';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AIAssistant from './components/AIAssistant';
import { canAccess } from './utils/permissions';
import { INDUSTRY_PRESETS } from './utils/industryPresets';

function PageRenderer() {
  const { state, dispatch } = useApp();
  const { currentPage, sidebarCollapsed, isLoggedIn, currentUser, businessProfile, snapshots, hydrated } = state;

  // IndexedDB is asynchronous. Rendering before hydration completes would show the
  // seed dataset, and the first save would then overwrite the operator's real data
  // with those seeds.
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Opening local database…</p>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return <Login />;
  }

  // Check if user has access to the current page
  const effectivePage = canAccess(currentUser.role, currentPage) ? currentPage : 'dashboard';

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'products': return <Products />;
      case 'customers': return <Customers />;
      case 'invoices': return <Invoices />;
      case 'accounting': return <Accounting />;
      case 'reports': return <Reports />;
      case 'shifts': return <Shifts />;
      case 'payroll': return <Payroll />;
      case 'database': return <DatabaseBackup />;
      case 'settings': return <Settings />;
      case 'users': return <Users />;
      default: return <Dashboard />;
    }
  };

  const activePreset = INDUSTRY_PRESETS[businessProfile.industry];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`} style={{ minHeight: '100vh' }}>
        {/* Top System Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 pl-6">
            <span className="text-sm font-bold text-slate-900">{businessProfile.companyName}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {activePreset?.icon} {activePreset?.name || 'Custom Business'}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              ZAR (R) · VAT {businessProfile.defaultVatRate}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canAccess(currentUser.role, 'settings') && (
              <button
                onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
              >
                ⚙ Customize Industry
              </button>
            )}
            {canAccess(currentUser.role, 'database') && (
              <button
                onClick={() => dispatch({ type: 'SET_PAGE', payload: 'database' })}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>🗄 SQL Backup ({snapshots.length})</span>
              </button>
            )}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_AI' })}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>✨ AI Copilot</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PageRenderer />
    </AppProvider>
  );
}
