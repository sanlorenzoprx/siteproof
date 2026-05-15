import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Mic, Play, ShieldCheck, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { JobWorkflowService } from '../services/jobWorkflowService';
import { Job } from '../types';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [photos, setPhotos] = useState<Record<string, number>>({});
  const [lastJob, setLastJob] = useState<Job | null>(null);
  const [search, setSearch] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await SiteProofDataService.getJobs();
      setJobs(data.sort((a, b) => b.updatedAt - a.updatedAt));
      
      const lastId = await SiteProofDataService.getLastActiveJobId();
      if (lastId) {
        const last = data.find(j => j.id === lastId);
        if (last && last.status !== 'COMPLETED') setLastJob(last);
      }

      // Load photo counts
      const counts: Record<string, number> = {};
      for (const job of data) {
        const jobPhotos = await SiteProofDataService.getPhotos(job.id);
        counts[job.id] = jobPhotos.length;
      }
      setPhotos(counts);
    }
    load();
  }, []);

  const handleQuickLaunch = async () => {
    if (!quickInput.trim()) return;
    
    const newJob = await JobWorkflowService.createFromQuickStart(quickInput);
    navigate(`/job/${newJob.id}`);
  };

  const filteredJobs = jobs.filter(j => 
    j.customerName.toLowerCase().includes(search.toLowerCase()) || 
    j.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Field Jobs</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Capture proof. Export reports. Work offline.</p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-[30px] font-black uppercase italic tracking-widest text-sm shadow-2xl shadow-blue-500/30 active:scale-95 transition-all"
        >
          <Plus size={20} className="stroke-[3px]" /> Start Job
        </button>
      </header>

      {/* One-Tap Quick Start */}
      <div className="flex gap-4">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickLaunch()}
          placeholder="Quick start: Generator install for Mike at 123 Main St..."
          className="flex-1 bg-white border border-slate-200 rounded-3xl px-8 py-5 text-xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300"
        />
        <button
          onClick={handleQuickLaunch}
          className="bg-slate-900 text-white px-10 rounded-3xl font-semibold flex items-center gap-3 hover:bg-black transition-all active:scale-95"
        >
          <Mic size={24} /> Go
        </button>
      </div>

      {/* Resume Last Job */}
      {lastJob && (
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => navigate(`/job/${lastJob.id}`)}
          className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-10 rounded-[35px] text-white cursor-pointer shadow-2xl flex justify-between items-center"
        >
          <div className="flex-1">
            <p className="uppercase tracking-[3px] text-blue-200 text-xs font-black mb-2">RESUME LAST JOB</p>
            <h3 className="text-4xl font-black mb-1">{lastJob.customerName}</h3>
            <p className="text-xl text-blue-100 font-medium">{lastJob.address} • {lastJob.jobType}</p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
            <Play size={40} className="ml-2" fill="currentColor" />
          </div>
        </motion.div>
      )}

      {/* Search Bar */}
      {jobs.length > 0 && (
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={24} />
          <input
            type="text"
            placeholder="Search for a Jobsite by customer or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-16 pr-6 py-6 bg-white border border-slate-200 rounded-[35px] focus:outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-blue-200 transition-all text-lg font-medium"
          />
        </div>
      )}

      {/* Empty State (Improved) */}
      {jobs.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-[45px] border-2 border-dashed border-slate-200">
          <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8">
            <ShieldCheck size={64} className="text-blue-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">READY FOR THE FIELD?</h3>
          <p className="text-xl text-slate-500 mt-3 max-w-md mx-auto font-medium leading-relaxed">
            Create your first job and start capturing bulletproof documentation in seconds.
          </p>
          <button
            onClick={() => navigate('/create')}
            className="mt-10 bg-blue-600 text-white px-12 py-5 rounded-[30px] text-xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
          >
            + Start First Job
          </button>
        </div>
      )}

      {/* Job List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredJobs.map(job => (
          <motion.div
            layoutId={job.id}
            key={job.id}
            onClick={() => navigate(`/job/${job.id}`)}
            className="bg-white border border-slate-200 rounded-[35px] p-8 hover:shadow-2xl hover:border-blue-200 cursor-pointer transition-all group"
          >
             <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <MapPin size={28} />
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic border",
                  job.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                )}>
                  {job.status}
                </div>
             </div>
             <div>
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-1">{job.customerName}</h3>
                <p className="text-slate-500 font-medium truncate mb-2">{job.address}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">{photos[job.id] || 0} Photos</span>
                  {photos[job.id] >= 5 && <span className="text-[10px] font-black bg-blue-50 px-2 py-1 rounded text-blue-600 uppercase tracking-widest italic">Proofed</span>}
                </div>
             </div>
             <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {job.jobType}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Calendar size={12} />
                  {format(job.updatedAt, 'MMM d, yyyy')}
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
