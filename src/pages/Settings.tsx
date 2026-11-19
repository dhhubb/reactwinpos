import React, { useState } from 'react';
import { useApp } from '../store';
import { INDUSTRY_PRESETS } from '../utils/industryPresets';
import { IndustryType } from '../types';
import { formatZAR } from '../utils/currency';

export default function Settings() {
  const { state, dispatch } = useApp();
  const { businessProfile } = state;
  const [form, setForm] = useState(businessProfile);
  const [loadSampleCatalog, setLoadSampleCatalog] = useState(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleApplyPreset = (industry: IndustryType) => {
    const preset = INDUSTRY_PRESETS[industry];
    dispatch({
      type: 'APPLY_INDUSTRY_PRESET',
      payload: { industry, loadSampleCatalog },
    });
    setForm(prev => ({
      ...prev,
      industry,
      defaultVatRate: preset.defaultVatRate,
      invoicePrefix: preset.invoicePrefix,
      receiptFooter: preset.receiptFooter,
      terminology: { ...preset.terminology },
    }));
    showToast(
      `Applied "${preset.name}" industry configuration${
        loadSampleCatalog && preset.sampleProducts.length > 0
          ? ` and loaded ${preset.sampleProducts.length} sample ZAR items.`
          : '.'
      }`
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_BUSINESS_PROFILE', payload: form });
    showToast('Business profile and terminology settings saved.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business & Industry Customizer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tailor Afritecx Badboy to fit any business in any industry · System Currency: ZAR (R)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            Active Industry: {INDUSTRY_PRESETS[businessProfile.industry]?.name || 'Custom'}
          </span>
        </div>
      </div>

      {savedNotice && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between">
          <span>{savedNotice}</span>
          <button onClick={() => setSavedNotice(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Industry Templates Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Choose an Industry Preset</h2>
            <p className="text-xs text-slate-500">
              Automatically adapts POS labels, inventory terminology, invoice prefixes, and optional ZAR catalog items
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={loadSampleCatalog}
              onChange={e => setLoadSampleCatalog(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Also load industry sample ZAR catalog
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(INDUSTRY_PRESETS) as IndustryType[]).map(key => {
            const preset = INDUSTRY_PRESETS[key];
            const isSelected = businessProfile.industry === key;
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-emerald-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{preset.icon}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{preset.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                    <div>POS: <span className="font-medium text-slate-700">{preset.terminology.posTitle}</span></div>
                    <div>Items: <span className="font-medium text-slate-700">{preset.terminology.productPlural}</span></div>
                    <div>Clients: <span className="font-medium text-slate-700">{preset.terminology.customerPlural}</span></div>
                    {preset.sampleProducts.length > 0 && (
                      <div className="text-emerald-600 font-medium">
                        {preset.sampleProducts.length} sample items (from {formatZAR(preset.sampleProducts[0].price)})
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? 'Re-Apply Preset' : 'Apply Industry Preset'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Company Profile & Terminology Form */}
      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company & Tax Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            2. Company Profile & SARS Tax Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company / Trading Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">System Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={e => setForm({ ...form, tagline: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CIPC Registration Number</label>
              <input
                type="text"
                value={form.registrationNumber}
                onChange={e => setForm({ ...form, registrationNumber: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">SARS VAT Registration Number</label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={e => setForm({ ...form, vatNumber: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Default VAT Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={form.defaultVatRate}
                onChange={e => setForm({ ...form, defaultVatRate: +e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={form.invoicePrefix}
                onChange={e => setForm({ ...form, invoicePrefix: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Physical Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">POS Receipt Footer Message</label>
              <input
                type="text"
                value={form.receiptFooter}
                onChange={e => setForm({ ...form, receiptFooter: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Custom Terminology & Branding */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              3. Custom Module Terminology & Labels
            </h2>
            <p className="text-xs text-slate-500">
              Rename core entities so the interface speaks your exact industry language (e.g. "Patients" instead of "Customers", or "Menu Items" instead of "Products").
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">POS Terminal Title</label>
                <input
                  type="text"
                  value={form.terminology.posTitle}
                  onChange={e =>
                    setForm({
                      ...form,
                      terminology: { ...form.terminology, posTitle: e.target.value },
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">System Currency (Fixed ZAR)</label>
                <input
                  type="text"
                  disabled
                  value="ZAR (R) - South African Rand"
                  className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Item Label (Singular)</label>
                <input
                  type="text"
                  value={form.terminology.productSingular}
                  onChange={e =>
                    setForm({
                      ...form,
                      terminology: { ...form.terminology, productSingular: e.target.value },
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Items Module Title (Plural)</label>
                <input
                  type="text"
                  value={form.terminology.productPlural}
                  onChange={e =>
                    setForm({
                      ...form,
                      terminology: { ...form.terminology, productPlural: e.target.value },
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Client Label (Singular)</label>
                <input
                  type="text"
                  value={form.terminology.customerSingular}
                  onChange={e =>
                    setForm({
                      ...form,
                      terminology: { ...form.terminology, customerSingular: e.target.value },
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clients Module Title (Plural)</label>
                <input
                  type="text"
                  value={form.terminology.customerPlural}
                  onChange={e =>
                    setForm({
                      ...form,
                      terminology: { ...form.terminology, customerPlural: e.target.value },
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              Save Business Configuration
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
