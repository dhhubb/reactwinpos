import { useState } from 'react';
import { useApp } from '../store';
import { Employee, PayrollRun } from '../types';
import { formatZAR } from '../utils/currency';
import { calculatePAYE, calculateUIF, calculatePayslip, toMonthlyGross, TAX_YEAR } from '../utils/payroll';
import { localDate } from '../utils/datetime';

export default function Payroll() {
  const { state, dispatch } = useApp();
  const { employees, payrollRuns } = state;
  const [tab, setTab] = useState<'employees' | 'runs' | 'new'>('employees');
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    code: '', name: '', position: '', department: '', salary: 0,
    payFrequency: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    bankAccount: '', taxNumber: '', email: '', phone: '',
    hireDate: localDate(), status: 'active' as 'active' | 'inactive',
  });
  const [calcSalary, setCalcSalary] = useState(20000);

  // Every active employee contributes to the monthly payroll; weekly and bi-weekly
  // staff were previously filtered out entirely, so their cost was never shown.
  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalMonthlyPayroll = activeEmployees
    .reduce((s, e) => s + toMonthlyGross(e.salary, e.payFrequency), 0);
  const totalMonthlyTax = activeEmployees
    .reduce((s, e) => s + calculatePAYE(toMonthlyGross(e.salary, e.payFrequency)), 0);
  const totalMonthlyUif = activeEmployees
    .reduce((s, e) => s + calculateUIF(toMonthlyGross(e.salary, e.payFrequency)), 0);

  const openNewEmp = () => {
    setEditingEmp(null);
    setEmpForm({ code: '', name: '', position: '', department: '', salary: 0, payFrequency: 'monthly', bankAccount: '', taxNumber: '', email: '', phone: '', hireDate: localDate(), status: 'active' });
    setShowEmpForm(true);
  };

  const openEditEmp = (e: Employee) => {
    setEditingEmp(e);
    setEmpForm({ code: e.code, name: e.name, position: e.position, department: e.department, salary: e.salary, payFrequency: e.payFrequency, bankAccount: e.bankAccount, taxNumber: e.taxNumber, email: e.email, phone: e.phone, hireDate: e.hireDate, status: e.status });
    setShowEmpForm(true);
  };

  const handleSaveEmp = () => {
    if (!empForm.name || !empForm.code) return;
    if (editingEmp) {
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: { ...editingEmp, ...empForm } });
    } else {
      dispatch({ type: 'ADD_EMPLOYEE', payload: empForm as Employee });
    }
    setShowEmpForm(false);
    setEditingEmp(null);
  };

  const handleRunPayroll = () => {
    const payable = employees.filter(e => e.status === 'active');
    if (payable.length === 0) return;

    // Gross is normalised to a monthly figure and PAYE is computed on that amount,
    // so a weekly-paid employee is taxed on their true monthly equivalent.
    const entries = payable.map(e => {
      const gross = toMonthlyGross(e.salary, e.payFrequency);
      const tax = calculatePAYE(gross);
      const net = Math.round((gross - tax) * 100) / 100;
      return { employeeId: e.id, employeeName: e.name, gross, tax, net, status: 'pending' as const };
    });

    const totalGross = entries.reduce((s, e) => s + e.gross, 0);
    const totalTax = entries.reduce((s, e) => s + e.tax, 0);
    const totalNet = entries.reduce((s, e) => s + e.net, 0);

    const period = new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
    const run: PayrollRun = {
      id: '',
      period,
      runDate: localDate(),
      entries,
      totalGross,
      totalTax,
      totalNet,
      status: 'draft',
    };
    dispatch({ type: 'ADD_PAYROLL_RUN', payload: run });
    setTab('runs');
  };

  const handleApproveRun = (run: PayrollRun) => {
    dispatch({ type: 'UPDATE_PAYROLL_RUN', payload: { ...run, status: 'approved' } });
  };

  const handlePayRun = (run: PayrollRun) => {
    dispatch({ type: 'UPDATE_PAYROLL_RUN', payload: { ...run, status: 'paid', entries: run.entries.map(e => ({ ...e, status: 'paid' as const })) } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Manage employees and process payroll (ZAR)</p>
        </div>
        <button onClick={handleRunPayroll} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
          Run Payroll
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Active Employees</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{employees.filter(e => e.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Monthly Gross</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatZAR(totalMonthlyPayroll)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Monthly PAYE</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatZAR(totalMonthlyTax)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-medium">Net Pay</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatZAR(totalMonthlyPayroll - totalMonthlyTax - totalMonthlyUif)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {([['employees', 'Employees'], ['runs', 'Payroll Runs'], ['new', 'Tax Calculator']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Employees Tab */}
      {tab === 'employees' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Employee Directory</h3>
            <button onClick={openNewEmp} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Employee
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Position</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Department</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Salary</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">PAYE</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Net</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => {
                  const monthly = toMonthlyGross(e.salary, e.payFrequency);
                  const tax = calculatePAYE(monthly);
                  return (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-xs font-mono text-slate-500">{e.code}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{e.name}</td>
                      <td className="px-5 py-3 text-slate-600">{e.position}</td>
                      <td className="px-5 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{e.department}</span></td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatZAR(monthly)}
                        {e.payFrequency !== 'monthly' && (
                          <span className="block text-[10px] text-slate-400">({formatZAR(e.salary)} / {e.payFrequency})</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-red-600">{formatZAR(tax)}</td>
                      <td className="px-5 py-3 text-right font-medium text-emerald-600">{formatZAR(monthly - tax)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditEmp(e)} className="text-slate-400 hover:text-emerald-600"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                          <button onClick={() => dispatch({ type: 'DELETE_EMPLOYEE', payload: e.id })} className="text-slate-400 hover:text-red-600"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Runs Tab */}
      {tab === 'runs' && (
        <div className="space-y-4">
          {payrollRuns.map(run => (
            <div key={run.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{run.period}</span>
                  <span className="ml-3 text-xs text-slate-400">Run on {run.runDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    run.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    run.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{run.status}</span>
                  {run.status === 'draft' && <button onClick={() => handleApproveRun(run)} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg">Approve</button>}
                  {run.status === 'approved' && <button onClick={() => handlePayRun(run)} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg">Mark Paid</button>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-slate-500 uppercase">Employee</th>
                      <th className="text-right px-5 py-2 text-xs font-medium text-slate-500 uppercase">Gross</th>
                      <th className="text-right px-5 py-2 text-xs font-medium text-slate-500 uppercase">PAYE Tax</th>
                      <th className="text-right px-5 py-2 text-xs font-medium text-slate-500 uppercase">Net Pay</th>
                      <th className="text-center px-5 py-2 text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.entries.map((entry, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-5 py-2 font-medium text-slate-800">{entry.employeeName}</td>
                        <td className="px-5 py-2 text-right text-slate-600">{formatZAR(entry.gross)}</td>
                        <td className="px-5 py-2 text-right text-red-600">{formatZAR(entry.tax)}</td>
                        <td className="px-5 py-2 text-right font-medium text-emerald-600">{formatZAR(entry.net)}</td>
                        <td className="px-5 py-2 text-center">
                          <span className={`text-xs font-medium ${entry.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{entry.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold border-t-2">
                      <td className="px-5 py-2 text-sm text-slate-800">Totals</td>
                      <td className="px-5 py-2 text-right text-slate-800">{formatZAR(run.totalGross)}</td>
                      <td className="px-5 py-2 text-right text-red-600">{formatZAR(run.totalTax)}</td>
                      <td className="px-5 py-2 text-right text-emerald-600">{formatZAR(run.totalNet)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
          {payrollRuns.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <p className="font-medium">No payroll runs yet</p>
              <p className="text-sm mt-1">Click "Run Payroll" to process monthly salaries</p>
            </div>
          )}
        </div>
      )}

      {/* Tax Calculator Tab */}
      {tab === 'new' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">SARS PAYE &amp; UIF Tax Calculator ({TAX_YEAR})</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Gross Salary (ZAR)</label>
              <input
                type="number"
                value={calcSalary}
                onChange={e => setCalcSalary(Math.max(0, +e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 uppercase">Annual Gross</p>
                <p className="text-base font-bold text-slate-800 mt-1">{formatZAR(calcSalary * 12)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-xs text-red-500 uppercase">Monthly PAYE</p>
                <p className="text-base font-bold text-red-600 mt-1">{formatZAR(calculatePAYE(calcSalary))}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-xs text-amber-600 uppercase">Monthly UIF (1%)</p>
                <p className="text-base font-bold text-amber-700 mt-1">{formatZAR(calculateUIF(calcSalary))}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-xs text-emerald-500 uppercase">Monthly Net</p>
                <p className="text-base font-bold text-emerald-600 mt-1">
                  {formatZAR(calculatePayslip(calcSalary).net)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Calculations use South African Revenue Service (SARS) PAYE brackets and UIF ceiling (R 177.12/month).</p>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showEmpForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowEmpForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingEmp ? 'Edit Employee' : 'Add Employee'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                <input type="text" value={empForm.code} onChange={e => setEmpForm({...empForm, code: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input type="text" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Position</label>
                <input type="text" value={empForm.position} onChange={e => setEmpForm({...empForm, position: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                <input type="text" value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Salary (ZAR)</label>
                <input type="number" step="0.01" value={empForm.salary} onChange={e => setEmpForm({...empForm, salary: +e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pay Frequency</label>
                <select value={empForm.payFrequency} onChange={e => setEmpForm({...empForm, payFrequency: e.target.value as any})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bank Account</label>
                <input type="text" value={empForm.bankAccount} onChange={e => setEmpForm({...empForm, bankAccount: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tax Number</label>
                <input type="text" value={empForm.taxNumber} onChange={e => setEmpForm({...empForm, taxNumber: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input type="text" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hire Date</label>
                <input type="date" value={empForm.hireDate} onChange={e => setEmpForm({...empForm, hireDate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={empForm.status} onChange={e => setEmpForm({...empForm, status: e.target.value as any})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEmpForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSaveEmp} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
