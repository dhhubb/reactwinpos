import { useRef, useState } from 'react';
import { useApp, verifyPassword, hashPassword } from '../store';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export default function Login() {
  const { state, dispatch } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const attempts = useRef(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (lockedUntil > Date.now()) {
      setError(`Too many failed attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)}s.`);
      return;
    }

    setBusy(true);
    const normalised = username.trim().toLowerCase();
    const user = state.users.find(u => u.username.toLowerCase() === normalised && u.active);

    // Password hashing is deliberately slow, so verify off the click handler's stack.
    const result = user
      ? verifyPassword(password, { passwordHash: user.passwordHash, password: user.password })
      : { ok: false, needsRehash: false };

    if (user && result.ok) {
      // Upgrade a legacy plain-text record to a salted hash on first successful sign-in.
      const migrated = result.needsRehash
        ? { ...user, password: '', passwordHash: hashPassword(password) }
        : user;
      attempts.current = 0;
      setError('');
      dispatch({ type: 'LOGIN', payload: migrated });
    } else {
      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        attempts.current = 0;
        setError(`Too many failed attempts. Locked for ${LOCKOUT_MS / 1000}s.`);
      } else {
        setError('Invalid username or password');
      }
    }
    setBusy(false);
  };

  const demoUsers = [
    { username: 'admin', password: 'admin123', role: 'Administrator — full access' },
    { username: 'manager', password: 'manager123', role: 'Manager — no user mgmt' },
    { username: 'accountant', password: 'account123', role: 'Accountant — finance only' },
    { username: 'cashier', password: 'cashier123', role: 'Cashier — POS only' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left - Branding */}
        <div className="text-white space-y-6 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Afritecx Badboy</h1>
              <p className="text-sm text-slate-300 font-medium uppercase tracking-wider">Accounting & POS System</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xl text-slate-200 leading-relaxed">
              Complete business management with Point of Sale, Accounting, Payroll, and Shift Management.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {['Point of Sale', 'Accounting', 'Payroll Manager', 'Shift Tracking', 'User Roles', 'Reports'].map(f => (
                <div key={f} className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Afritecx Badboy</h1>
              <p className="text-xs text-slate-500">Accounting & POS</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Demo Accounts</p>
            <div className="space-y-2">
              {demoUsers.map(u => (
                <button
                  key={u.username}
                  onClick={() => { setUsername(u.username); setPassword(u.password); }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm transition-colors"
                >
                  <span className="font-mono text-slate-700">{u.username} / {u.password}</span>
                  <span className="text-xs text-slate-400">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
