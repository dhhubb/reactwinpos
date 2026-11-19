import { useState } from 'react';
import { useApp } from '../store';
import { User, UserRole } from '../types';
import { roleLabels, roleColors, canAccess } from '../utils/permissions';
import { Page } from '../types';

export default function Users() {
  const { state, dispatch } = useApp();
  const { users, currentUser } = state;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '',
    role: 'cashier' as UserRole, active: true,
  });
  const [formError, setFormError] = useState('');

  const openNew = () => {
    setEditing(null);
    setForm({ username: '', password: '', fullName: '', email: '', role: 'cashier', active: true });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    // The stored credential is a hash, so the field always starts empty; leaving it
    // blank keeps the existing password, typing a value replaces it.
    setForm({ username: u.username, password: '', fullName: u.fullName, email: u.email, role: u.role, active: u.active });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = () => {
    const username = form.username.trim().toLowerCase();
    if (!username || !form.fullName.trim()) {
      setFormError('Full name and username are required.');
      return;
    }
    if (!editing && !form.password) {
      setFormError('A password is required for a new user.');
      return;
    }
    if (form.password && form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    const clash = users.some(u => u.username.toLowerCase() === username && u.id !== editing?.id);
    if (clash) {
      setFormError('That username is already taken.');
      return;
    }
    // Never let the last administrator be demoted or disabled.
    if (editing?.role === 'admin' && (form.role !== 'admin' || !form.active)) {
      const otherAdmins = users.filter(u => u.role === 'admin' && u.active && u.id !== editing.id);
      if (otherAdmins.length === 0) {
        setFormError('At least one active administrator must remain.');
        return;
      }
    }

    if (editing) {
      dispatch({ type: 'UPDATE_USER', payload: { ...editing, ...form, username } });
    } else {
      dispatch({ type: 'ADD_USER', payload: { ...form, username } as User });
    }
    setShowForm(false);
    setEditing(null);
    setFormError('');
  };

  const allPages: Page[] = ['dashboard', 'pos', 'products', 'customers', 'invoices', 'accounting', 'reports', 'shifts', 'payroll', 'database', 'settings', 'users'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage users, passwords, and access levels</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Active Users</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{users.filter(u => u.active).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Admins</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Roles</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">4</p>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Role Permission Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Module</th>
                {(['admin', 'manager', 'accountant', 'cashier'] as UserRole[]).map(r => (
                  <th key={r} className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">{roleLabels[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPages.map(page => (
                <tr key={page} className="border-b border-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-800 capitalize">{page}</td>
                  {(['admin', 'manager', 'accountant', 'cashier'] as UserRole[]).map(r => (
                    <td key={r} className="px-5 py-2.5 text-center">
                      {canAccess(r, page) ? (
                        <svg className="w-4 h-4 mx-auto text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg className="w-4 h-4 mx-auto text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">User Accounts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Username</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Full Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Password</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Last Login</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono text-slate-800">{u.username}{currentUser?.id === u.id && <span className="ml-2 text-xs text-emerald-600">(you)</span>}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{u.fullName}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-500">
                      {u.passwordHash ? 'Hashed' : u.password ? 'Plain text' : 'Not set'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-ZA') : 'Never'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-emerald-600" title="Edit">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      {currentUser?.id !== u.id && (
                        <button onClick={() => dispatch({ type: 'DELETE_USER', payload: u.id })} className="text-slate-400 hover:text-red-600" title="Delete">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editing ? 'Edit User' : 'Add User'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password {editing && <span className="text-slate-400 font-normal">(leave blank to keep)</span>}
                </label>
                <input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="admin">Administrator — Full Access</option>
                  <option value="manager">Manager — No User Mgmt</option>
                  <option value="accountant">Accountant — Finance Only</option>
                  <option value="cashier">Cashier — POS Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.active ? 'active' : 'inactive'} onChange={e => setForm({...form, active: e.target.value === 'active'})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="active">Active</option>
                  <option value="inactive">Disabled</option>
                </select>
              </div>
            </div>
            {/* Permission preview */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-600 mb-2">Access to modules:</p>
              <div className="flex flex-wrap gap-1.5">
                {allPages.map(p => (
                  <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${canAccess(form.role, p) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
            {formError && (
              <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{formError}</div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setFormError(''); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
