import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, Settings, ShieldCheck, LayoutList, AlertCircle, CheckCircle2, RotateCw, CloudOff, ClipboardCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { CloudService } from '../services/cloudService';
import { SiteProofDataService } from '../services/siteProofDataService';
import { SyncRuntime } from '../services/sync/syncRuntime';
import { BusinessProfile } from '../types';
import { useSyncRuntimeStatus } from '../hooks/useSyncRuntimeStatus';
import { formatDistanceToNow } from 'date-fns';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const syncState = useSyncRuntimeStatus();

  useEffect(() => {
    async function load() {
      const b = await SiteProofDataService.getBusinessProfile();
      setBusiness(b);
    }
    load();
    
    // Initial sync
    void SyncRuntime.processQueue();
  }, []);

  const navItems = [
    { icon: LayoutList, label: 'Dashboard', path: '/dashboard' },
    { icon: ClipboardList, label: 'Field Jobs', path: '/' },
    { icon: ClipboardCheck, label: 'Pilot', path: '/pilot-readiness' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col text-slate-300">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl text-white tracking-tight uppercase italic">{business?.companyName || 'SiteProof'}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                location.pathname === item.path 
                  ? "bg-blue-600/10 text-blue-400 font-medium" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                location.pathname === item.path ? "text-blue-400" : "group-hover:text-white"
              )} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sync Status Indicator (10X Improvement C) */}
        {syncState && (
          <div className="mx-4 mb-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sync Queue</span>
              {syncState.isSyncing ? (
                <RotateCw size={12} className="text-blue-500 animate-spin" />
              ) : !syncState.online ? (
                <CloudOff size={12} className="text-orange-500" />
              ) : syncState.lastError ? (
                <AlertCircle size={12} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={12} className="text-green-500" />
              )}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">Status</span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-tighter",
                  !syncState.online ? "text-orange-400" : syncState.isSyncing ? "text-blue-400" : syncState.lastError ? "text-amber-400" : syncState.pending > 0 ? "text-blue-300" : "text-green-400"
                )}>
                  {!syncState.online ? 'Offline' : syncState.isSyncing ? 'Syncing...' : syncState.lastError ? 'Needs Setup' : syncState.pending > 0 ? 'Queued' : 'Synced'}
                </span>
              </div>
              
              {syncState.pending > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">Queue</span>
                  <span className="text-[10px] font-black text-white">{syncState.pending} pending</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">Last Sync</span>
                <span className="text-[10px] font-bold text-slate-500 italic">
                  {syncState.lastSyncTime ? formatDistanceToNow(syncState.lastSyncTime, { addSuffix: true }) : 'Never'}
                </span>
              </div>

              {syncState.lastError && (
                <div className="mt-2 text-[9px] text-amber-400/90 leading-tight border-t border-amber-500/10 pt-2">
                  {syncState.lastError}
                </div>
              )}

              {syncState.failed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">Failed</span>
                  <span className="text-[10px] font-black text-red-400">{syncState.failed} needs attention</span>
                </div>
              )}
              
              <button 
                onClick={() => void SyncRuntime.processQueue()}
                disabled={syncState.isSyncing}
                className="w-full mt-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 transition-colors disabled:opacity-50"
              >
                Sync Now
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          v1.0.0 Pilot
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={24} />
            <span className="font-bold text-lg tracking-tight uppercase italic">{business?.companyName || 'SiteProof'}</span>
          </div>
          <button onClick={() => navigate('/settings')} className="p-2 text-slate-600">
            <Settings size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50/50">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden h-16 bg-white border-t flex items-center justify-around px-4 pb-safe sticky bottom-0 z-10">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1",
                location.pathname === item.path ? "text-blue-600" : "text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
