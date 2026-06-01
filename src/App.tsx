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
import { CheckoutThankYou } from './components/CheckoutThankYou';
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
import { PurchaseIntakeBootstrapService } from './services/purchaseIntakeBootstrapService';
import { useSettings } from './contexts/SettingsContext';

function LicenseBanner({ license, t }: { license: LicenseState | null; t: (key: string) => string }) {
  if (!license || license.status === 'licensed') return null;
  const days = LicenseService.getDaysRemaining(license);
  const withDays = (key: string) => t(key).replace('{days}', String(days));
  const text = license.status === 'trial_active'
    ? withDays('license.bannerTrialActive')
    : license.status === 'trial_expired'
      ? t('license.bannerTrialExpired')
      : license.status === 'offline_grace'
        ? withDays('license.bannerOfflineGrace')
        : license.status === 'license_pending_verification'
          ? t('license.bannerPendingVerification')
          : license.status === 'revoked'
            ? t('license.bannerRevoked')
            : license.status === 'expired'
              ? t('license.bannerExpired')
              : license.status === 'device_limit_exceeded'
                ? t('license.bannerDeviceLimit')
                : t('license.bannerRequired');
  return (
    <button onClick={() => window.location.assign('/license')} className="w-full bg-slate-900 text-white text-xs font-black uppercase tracking-widest py-2">
      {text}
    </button>
  );
}

export default function App() {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useSettings();

  useEffect(() => {
    async function init() {
      await RuntimeOrchestrator.initialize().catch((error) => console.warn('Runtime initialization failed:', error));
      await CloudService.initialize().catch((error) => console.warn('Cloud configuration initialization failed:', error));
      SyncRuntime.initialize();
      SyncRuntime.startAutoSync();

      // 1. Local-first license check
      const activationParams = PurchaseIntakeBootstrapService.parseActivationLink();
      const currentLicense = activationParams
        ? (await PurchaseIntakeBootstrapService.bootstrapFromActivationLink(activationParams)).license
        : await LicenseService.getState();
      const verifiedLicense = !activationParams && typeof navigator !== 'undefined' && navigator.onLine !== false && ['licensed', 'offline_grace', 'license_pending_verification'].includes(currentLicense.status)
        ? (await LicenseService.verifyLicense()).state
        : currentLicense;
      setLicense(verifiedLicense);

      // 2. Onboarding Check
      const profile = await SiteProofDataService.getBusinessProfile();
      setIsOnboarded(!!profile);
      if (activationParams) {
        window.history.replaceState({}, document.title, window.location.pathname || '/');
        navigate('/settings', { replace: true });
      }

      setLoading(false);
    }
    init();
  }, [navigate]);

  if (loading || isOnboarded === null) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white font-bold tracking-tighter text-2xl italic">{SITEPROOF_BRAND.appName.toUpperCase()}...</div>;

  return (
    <>
    <LicenseBanner license={license} t={t} />
    <OfflineStatusBanner />
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/onboarding" element={<Onboarding onComplete={() => setIsOnboarded(true)} />} />
        <Route path="/license" element={<LicenseScreen license={license} onUpdate={setLicense} />} />
        <Route path="/checkout/siteproof" element={<CheckoutThankYou />} />
        
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
