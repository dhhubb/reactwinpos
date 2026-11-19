import { useApp } from '../store';
import { Page } from '../types';
import { ReactNode } from 'react';
import { canAccess, roleLabels } from '../utils/permissions';

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const collapsed = state.sidebarCollapsed;
  const { businessProfile } = state;

  const navItems: { id: Page; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>) },
    { id: 'pos', label: businessProfile.terminology.posTitle, icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>) },
    { id: 'products', label: businessProfile.terminology.productPlural, icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>) },
    { id: 'customers', label: businessProfile.terminology.customerPlural, icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>) },
    { id: 'invoices', label: 'Sales & Invoices', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>) },
    { id: 'accounting', label: 'Accounting', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>) },
    { id: 'reports', label: 'Reports', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>) },
    { id: 'shifts', label: 'Shifts & Cash', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>) },
    { id: 'payroll', label: 'Payroll (SARS)', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><circle cx="17" cy="15" r="1" /></svg>) },
    { id: 'database', label: 'SQL DB & Backup', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>) },
    { id: 'settings', label: 'Industry Customizer', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>) },
    { id: 'users', label: 'Users & Access', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>) },
  ];

  return (
    <>
      {/* Toggle Button - floating outside sidebar */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className={`fixed top-4 z-50 transition-all duration-300 ${
          collapsed ? 'left-4' : 'left-[260px]'
        } w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow-lg border border-slate-700/50`}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
      >
        <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-40 bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-64 opacity-100'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50 min-w-64">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="whitespace-nowrap overflow-hidden">
            <h1 className="text-base font-bold tracking-tight truncate">{businessProfile.companyName}</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">{businessProfile.tagline}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto min-w-64">
          {navItems.filter(item => state.currentUser && canAccess(state.currentUser.role, item.id)).map((item) => {
            const isActive = state.currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_PAGE', payload: item.id })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-slate-700/50 min-w-64">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold shrink-0">
              {state.currentUser?.fullName.charAt(0) || 'U'}
            </div>
            <div className="text-xs whitespace-nowrap flex-1">
              <p className="font-medium text-white truncate">{state.currentUser?.fullName}</p>
              <p className="text-slate-400">{state.currentUser ? roleLabels[state.currentUser.role] : ''}</p>
            </div>
            <button onClick={() => dispatch({ type: 'LOGOUT' })} className="text-slate-400 hover:text-red-400 transition-colors" title="Logout">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Collapsed mini sidebar - icons only */}
      <aside className={`fixed left-0 top-0 h-full z-40 bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16 opacity-100' : 'w-0 overflow-hidden opacity-0'
      }`}>
        {/* Mini Logo */}
        <div className="flex items-center justify-center h-[68px] border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
        </div>

        {/* Mini Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto flex flex-col items-center">
          {navItems.filter(item => state.currentUser && canAccess(state.currentUser.role, item.id)).map((item) => {
            const isActive = state.currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_PAGE', payload: item.id })}
                className={`flex items-center justify-center w-12 h-11 rounded-lg transition-all duration-150 relative ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title={item.label}
              >
                {item.icon}
                {isActive && <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </nav>

        {/* Mini Bottom */}
        <div className="py-4 border-t border-slate-700/50 flex justify-center">
          <button onClick={() => dispatch({ type: 'LOGOUT' })} title="Logout" className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-xs font-bold">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </aside>
    </>
  );
}
