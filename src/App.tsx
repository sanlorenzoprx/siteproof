import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { SiteProofDataService } from './services/siteProofDataService';
import { Layout } from './components/Layout';
import { JobList } from './components/JobList';
import { Dashboard } from './components/Dashboard';
import { CreateJob } from './components/CreateJob';
import { JobDetail } from './components/JobDetail';
import { CameraCapture } from './components/CameraCapture';
import { VoiceNoteCapture } from './components/VoiceNoteCapture';
import { LicenseScreen } from './components/LicenseScreen';
import { Settings } from './components/Settings';
import { SpeechCalibration } from './components/SpeechCalibration';
import { Onboarding } from './components/Onboarding';
import { PinGate } from './components/PinGate';
import { OfflineStatusBanner } from './components/offline/OfflineStatusBanner';
import { PilotReadiness } from './components/pilot/PilotReadiness';
import { motion, AnimatePresence } from 'motion/react';
import { RuntimeOrchestrator } from './services/runtimeOrchestrator';
import { SyncRuntime } from './services/sync/syncRuntime';
import { CloudService } from './services/cloudService';
import { SITEPROOF_BRAND } from './config/brand';
import { LicenseService, type LicenseState } from './services/licenseService';

export default function App() {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      await RuntimeOrchestrator.initialize().catch((error) => console.warn('Runtime initialization failed:', error));
      await CloudService.initialize().catch((error) => console.warn('Cloud configuration initialization failed:', error));
      SyncRuntime.initialize();
      SyncRuntime.startAutoSync();

      // 1. Local-first license check
      const currentLicense = await LicenseService.getState();
      setLicense(currentLicense);

      // 2. Onboarding Check
      const profile = await SiteProofDataService.getBusinessProfile();
      setIsOnboarded(!!profile);

      setLoading(false);
    }
    init();
  }, [navigate]);

  if (loading || isOnboarded === null) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white font-bold tracking-tighter text-2xl italic">{SITEPROOF_BRAND.appName.toUpperCase()}...</div>;

  return (
    <>
    <OfflineStatusBanner />
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/onboarding" element={<Onboarding onComplete={() => setIsOnboarded(true)} />} />
        <Route path="/license" element={<LicenseScreen license={license} onUpdate={setLicense} />} />
        
        {!isOnboarded ? (
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<JobList />} />
            <Route path="/dashboard" element={<PinGate><Dashboard /></PinGate>} />
            <Route path="/create" element={<CreateJob />} />
            <Route path="/job/:id" element={<JobDetail />} />
            <Route path="/job/:id/camera" element={<CameraCapture />} />
            <Route path="/job/:id/voice" element={<VoiceNoteCapture />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/speech" element={<SpeechCalibration />} />
            <Route path="/pilot-readiness" element={<PilotReadiness />} />
          </Route>
        )}
      </Routes>
    </AnimatePresence>
    </>
  );
}
