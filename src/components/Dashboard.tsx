import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Clock, DollarSign, TrendingUp, 
  Users, CheckCircle2, AlertCircle, ChevronRight,
  TrendingDown, Briefcase, Activity
} from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { Job, JobStatus } from '../types';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await SiteProofDataService.getJobs();
      setJobs(data);
      setLoading(false);
    }
    load();
  }, []);

  const stats = [
    { 
      label: 'Backlog Value', 
      value: `$${jobs.reduce((acc, job) => job.status !== 'COMPLETED' ? acc + (job.quotedAmount || 0) : acc, 0).toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-blue-500'
    },
    { 
      label: 'Active Pipeline', 
      value: jobs.filter(j => j.status === 'ACTIVE').length.toString(),
      change: '+3 this week',
      trend: 'up',
      icon: Activity,
      color: 'bg-indigo-500'
    },
    { 
      label: 'Avg Cycle Time', 
      value: '4.2 Days',
      change: '-0.5 days',
      trend: 'down',
      icon: Clock,
      color: 'bg-purple-500'
    },
    { 
      label: 'Completion Rate', 
      value: `${Math.round((jobs.filter(j => j.status === 'COMPLETED').length / (jobs.length || 1)) * 100)}%`,
      change: '+5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-green-500'
    }
  ];

  const statuses: JobStatus[] = ['INCOMING', 'ACTIVE', 'WAITING', 'INSPECTION', 'COMPLETED'];
  
  const weeklySchedule = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(new Date()), i));

  if (loading) {
    return <div className="p-8 animate-pulse space-y-4">
      <div className="h-32 bg-white rounded-3xl" />
      <div className="grid grid-cols-4 gap-4">
        <div className="h-32 bg-white rounded-3xl" />
        <div className="h-32 bg-white rounded-3xl" />
        <div className="h-32 bg-white rounded-3xl" />
        <div className="h-32 bg-white rounded-3xl" />
      </div>
    </div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">HQ Dashboard</h1>
          <p className="text-slate-500 font-medium">Business intelligence and growth tracking for SiteProof.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
          >
            Field View
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            Quick Schedule
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 group-hover:scale-110 transition-transform", stat.color.replace('bg-', 'text-'))}>
              <stat.icon size={96} />
            </div>
            <div className="relative">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg", stat.color)}>
                <stat.icon size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-slate-900">{stat.value}</span>
                <span className={cn(
                  "text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-md",
                  stat.trend === 'up' ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"
                )}>
                  {stat.change}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pipeline Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              Incoming & Active Pipeline
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {statuses.map((status) => {
              const statusJobs = jobs.filter(j => j.status === status);
              return (
                <div key={status} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{status}</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-bold text-slate-600">{statusJobs.length}</span>
                  </div>
                  <div className="space-y-3 min-h-[100px] p-2 rounded-2xl border-2 border-dashed border-slate-100">
                    {statusJobs.length > 0 ? statusJobs.map(job => (
                      <motion.div
                        layoutId={job.id}
                        key={job.id}
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 group"
                      >
                        <h4 className="text-xs font-bold text-slate-900 truncate mb-1 group-hover:text-blue-600 transition-colors">{job.customerName}</h4>
                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-slate-400">
                          <span>{job.jobType.split(' ')[0]}</span>
                          {job.quotedAmount && <span>${job.quotedAmount.toLocaleString()}</span>}
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-[10px] text-slate-300 text-center py-4 font-medium italic">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Sidebar */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Weekly Schedule
          </h2>
          <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm divide-y divide-slate-100">
            {weeklySchedule.map((date) => {
              const dayJobs = jobs.filter(j => j.scheduledDate && isSameDay(j.scheduledDate, date));
              return (
                <div key={date.toString()} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{format(date, 'EEEE')}</div>
                      <div className="text-sm font-black text-slate-900">{format(date, 'MMM d')}</div>
                    </div>
                    {dayJobs.length > 0 && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full">{dayJobs.length}</span>}
                  </div>
                  <div className="space-y-2">
                    {dayJobs.map(job => (
                      <div key={job.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 group cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => navigate(`/job/${job.id}`)}>
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">{job.customerName}</div>
                          <div className="text-[8px] text-slate-500 truncate">{job.address}</div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                    ))}
                    {dayJobs.length === 0 && <div className="text-[10px] text-slate-400 italic">No scheduled jobs</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
