import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobWorkflowService } from '../services/jobWorkflowService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { TradeTemplatePackService } from '../services/tradeTemplatePackService';
import { ArrowLeft, FileText, Info } from 'lucide-react';
import { JobStatus } from '../types';
import { VoiceDictation } from './VoiceDictation';
import { useSettings } from '../contexts/SettingsContext';
import { LicenseService } from '../services/licenseService';

export function CreateJob() {
  const { settings, t } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    address: '',
    jobType: 'Generator Install',
    technicianName: '',
    technicianRole: 'Electrician',
    quotedAmount: '',
    scheduledDate: '',
    notes: '',
    templateId: 'generator_install_v1',
    tradePackId: 'generator_install_v1',
    trade: 'Electrical',
    specialty: 'Generator Install'
  });

  async function createJob(openDocumentCapture: boolean) {
    if (!form.customerName || !form.address) return;
    const license = await LicenseService.getLicenseState();
    if (!LicenseService.canCreateJob(license)) {
      alert(t('license.trialEndedMessage'));
      navigate('/license');
      return;
    }
    
    setLoading(true);
    const newJob = await JobWorkflowService.createJob({
      customerName: form.customerName,
      address: form.address,
      jobType: form.jobType,
      technicianName: form.technicianName,
      technicianRole: form.technicianRole,
      quotedAmount: form.quotedAmount ? parseFloat(form.quotedAmount) : undefined,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).getTime() : undefined,
      notes: form.notes,
      templateId: form.templateId,
      tradePackId: form.tradePackId,
      trade: form.trade,
      specialty: form.specialty,
      status: 'ACTIVE' as JobStatus,
    });
    setLoading(false);
    navigate(`/job/${newJob.id}${openDocumentCapture ? '?document=setup' : ''}`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createJob(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white rounded-xl text-slate-500 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">{t('jobs.startJob')}</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.customerName')}</label>
            <div className="relative">
              <input type="text" required value={form.customerName} 
                onChange={e => setForm({...form, customerName: e.target.value})}
                placeholder={t('jobs.customerPlaceholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-14" />
              <VoiceDictation 
                onResult={(text) => setForm({...form, customerName: text})}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.jobAddress')}</label>
            <div className="relative">
              <input type="text" required value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                placeholder={t('jobs.addressPlaceholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-14" />
              <VoiceDictation 
                onResult={(text) => setForm({...form, address: text})}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.template')}</label>
              <select value={form.templateId} onChange={e => setForm({...form, templateId: e.target.value, jobType: e.target.options[e.target.selectedIndex].text})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                {TemplateCatalogService.getTemplateOptions(settings.uiLanguage).map((option) => (
                  <option key={option.templateId} value={option.templateId}>{option.displayName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Trade / specialty</label>
              <select
                value={form.tradePackId}
                onChange={e => {
                  const pack = TradeTemplatePackService.getPack(e.target.value);
                  setForm({
                    ...form,
                    tradePackId: pack.packId,
                    trade: pack.trade,
                    specialty: pack.specialty,
                    jobType: pack.displayName,
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                {TradeTemplatePackService.getOptions().map((option) => (
                  <option key={option.packId} value={option.packId}>{option.trade} - {option.specialty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 space-y-2">
            <p className="text-sm font-black text-amber-950">SiteProof guides your crew step by step, showing exactly what proof to capture for your trade before, during, and after the job.</p>
            <p className="text-xs font-bold text-amber-900">This job has required proof steps. SiteProof will help you capture the photos, notes, timestamps, and inspection evidence needed for this trade.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.quoteAmount')}</label>
              <input type="number" value={form.quotedAmount}
                onChange={e => setForm({...form, quotedAmount: e.target.value})}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
            </div>
          </div>

          {/* Technician Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.technicianName')}</label>
              <input type="text" value={form.technicianName}
                onChange={e => setForm({...form, technicianName: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                placeholder={t('jobs.technicianNamePlaceholder')} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.technicianRole')}</label>
              <input type="text" value={form.technicianRole}
                onChange={e => setForm({...form, technicianRole: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                placeholder={t('jobs.technicianRolePlaceholder')} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.initialNotes')}</label>
            <div className="relative">
              <textarea
                rows={3}
                placeholder={t('jobs.notesPlaceholder')}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-14"
              />
              <VoiceDictation 
                onResult={(text) => setForm({...form, notes: (form.notes ? form.notes + ' ' : '') + text})}
                className="absolute right-3 top-4"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-3xl flex items-start gap-3 border border-blue-100">
          <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <p className="text-xs text-blue-800 font-bold leading-relaxed italic">
            {t('jobs.createHelp')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void createJob(true)}
          disabled={loading}
          className="w-full bg-white border border-blue-200 text-blue-700 py-5 rounded-[28px] text-sm font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FileText size={18} /> Start Job + Add Permit / Inspection Document
        </button>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-6 rounded-[30px] text-xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? "{t('jobs.starting')}" : "{t('jobs.startJob')} →"}
        </button>
      </form>
    </div>
  );
}
