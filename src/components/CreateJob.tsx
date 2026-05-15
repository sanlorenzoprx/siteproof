import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobWorkflowService } from '../services/jobWorkflowService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { JobStatus } from '../types';
import { VoiceDictation } from './VoiceDictation';
import { useSettings } from '../contexts/SettingsContext';

export function CreateJob() {
  const { t } = useSettings();
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
    templateId: 'generator_install_v1'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.address) return;
    
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
      status: 'ACTIVE' as JobStatus,
    });
    setLoading(false);
    navigate(`/job/${newJob.id}`);
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
                placeholder="e.g. John Doe / ACME Corp"
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
                placeholder="Full street address, city, state"
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
                {TemplateCatalogService.getTemplateOptions().map((option) => (
                  <option key={option.templateId} value={option.templateId}>{option.displayName}</option>
                ))}
              </select>
            </div>

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
                placeholder="Name of Lead" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.technicianRole')}</label>
              <input type="text" value={form.technicianRole}
                onChange={e => setForm({...form, technicianRole: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                placeholder="Lead Electrician, etc." />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('jobs.initialNotes')}</label>
            <div className="relative">
              <textarea
                rows={3}
                placeholder="Any quick reminders or setup info..."
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
