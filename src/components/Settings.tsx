import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, Shield, Database, Save, CheckCircle, Smartphone, Mic as MicIcon } from 'lucide-react';
import { CloudService } from '../services/cloudService';
import { SiteProofDataService } from '../services/siteProofDataService';
import { AppSettingsService } from '../services/appSettingsService';
import { BusinessProfile, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { VoiceDictation } from './VoiceDictation';
import { BusinessOverviewField } from './BusinessOverviewField';
import { TaglineGeneratorField } from './TaglineGeneratorField';
import { LanguageSettingsPanel } from './settings/LanguageSettingsPanel';
import { CloudUpsellCard } from './cloud/CloudUpsellCard';
import { useSettings } from '../contexts/SettingsContext';

export function Settings() {
  const { settings, updateSettings, t } = useSettings();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [speechCalibrated, setSpeechCalibrated] = useState(false);

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      await CloudService.initialize();
      const cloudConfig = CloudService.getConfiguration();
      setUrl(cloudConfig.url);
      setKey(cloudConfig.key);
      const b = await SiteProofDataService.getBusinessProfile();
      const u = await SiteProofDataService.getUserProfile();
      const calibrated = await AppSettingsService.isSpeechCalibrated();
      
      const defaultBusiness: BusinessProfile = {
        companyName: '',
        tagline: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: '',
        email: '',
        website: '',
        linkedIn: '',
        businessBio: '',
        licenseNumber: '',
        regulatoryInfo: '',
        adminPin: ''
      };

      const defaultUser: UserProfile = {
        id: crypto.randomUUID(),
        fullName: '',
        email: '',
        role: 'Field Technician'
      };

      setBusiness(b ? { ...defaultBusiness, ...b } : defaultBusiness);
      setUser(u ? { ...defaultUser, ...u } : defaultUser);
      setSpeechCalibrated(calibrated);
    }
    loadProfiles();
  }, []);

  async function handleSave() {
    CloudService.setConfiguration({ url, key });
    if (business) await SiteProofDataService.saveBusinessProfile(business);
    if (user) await SiteProofDataService.saveUserProfile(user);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('settings.title')}</h1>
      </header>

      <div className="space-y-6">
        <LanguageSettingsPanel />
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="bg-green-600/10 p-2 rounded-lg">
              <Smartphone className="text-green-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t('settingsDetail.fieldExperience')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('settingsDetail.uxMode')}</span>
              <select value={settings.uxMode} onChange={(event) => void updateSettings({ uxMode: event.target.value as typeof settings.uxMode })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
                <option value="simple">{t('settingsDetail.simpleMode')}</option>
                <option value="advanced">{t('settingsDetail.advancedMode')}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('settingsDetail.hints')}</span>
              <select value={settings.hintMode} onChange={(event) => void updateSettings({ hintMode: event.target.value as typeof settings.hintMode })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
                <option value="guided">{t('settingsDetail.guided')}</option>
                <option value="minimal">{t('settingsDetail.minimal')}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('settingsDetail.theme')}</span>
              <select value={settings.themeMode} onChange={(event) => void updateSettings({ themeMode: event.target.value as typeof settings.themeMode })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
                <option value="light">{t('settingsDetail.light')}</option>
                <option value="dark">{t('settingsDetail.dark')}</option>
                <option value="system">{t('settingsDetail.system')}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('settingsDetail.textSize')}</span>
              <select value={settings.textSize} onChange={(event) => void updateSettings({ textSize: event.target.value as typeof settings.textSize })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
                <option value="small">{t('settingsDetail.textSmall')}</option>
                <option value="normal">{t('settingsDetail.textNormal')}</option>
                <option value="large">{t('settingsDetail.textLarge')}</option>
                <option value="xl">{t('settingsDetail.textXl')}</option>
                <option value="xxl">{t('settingsDetail.textXxl')}</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold">
              {t('settingsDetail.voiceHelp')}
              <input type="checkbox" checked={settings.voiceHelpEnabled} onChange={(event) => void updateSettings({ voiceHelpEnabled: event.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold">
              {t('settingsDetail.alwaysShowProofHints')}
              <input type="checkbox" checked={settings.alwaysShowProofHints} onChange={(event) => void updateSettings({ alwaysShowProofHints: event.target.checked })} />
            </label>
          </div>
        </section>
        {/* Business & Identity Section */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
           <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600/10 p-2 rounded-lg">
              <Shield className="text-blue-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t('settingsDetail.brandIdentity')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('settingsDetail.companyDetails')}</h3>
                <div className="space-y-3">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.businessName')}</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={business?.companyName || ''} 
                          onChange={e => setBusiness({...business!, companyName: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium pr-10"
                        />
                        <VoiceDictation 
                          onResult={(text) => setBusiness({...business!, companyName: text})}
                          className="absolute right-1 top-1/2 -translate-y-1/2 scale-75"
                        />
                      </div>
                   </div>
                   <TaglineGeneratorField 
                      value={business?.tagline || ''}
                      companyName={business?.companyName || ''}
                      onChange={(tagline) => setBusiness({...business!, tagline})}
                   />

                   <BusinessOverviewField 
                      value={business?.businessBio || ''}
                      companyName={business?.companyName || ''}
                      onChange={(bio) => setBusiness({...business!, businessBio: bio})}
                   />

                   <div className="space-y-1 pt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('settingsDetail.businessAddress')}</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={business?.address || ''} 
                          onChange={e => setBusiness({...business!, address: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium mb-2 pr-10"
                          placeholder={t('settingsDetail.streetAddress')}
                        />
                        <VoiceDictation 
                          onResult={(text) => setBusiness({...business!, address: text})}
                          className="absolute right-1 top-1/2 -translate-y-1/2 -mt-1 scale-75"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder={t('settingsDetail.city')}
                          value={business?.city || ''} 
                          onChange={e => setBusiness({...business!, city: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        />
                        <input 
                          type="text" 
                          placeholder={t('settingsDetail.stateProvince')}
                          value={business?.state || ''} 
                          onChange={e => setBusiness({...business!, state: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        />
                        <input 
                          type="text" 
                          placeholder={t('settingsDetail.zipPostal')}
                          value={business?.zipCode || ''} 
                          onChange={e => setBusiness({...business!, zipCode: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        />
                        <input 
                          type="text" 
                          placeholder={t('settingsDetail.country')}
                          value={business?.country || ''} 
                          onChange={e => setBusiness({...business!, country: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-2 pt-2">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.phone')}</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={business?.phone || ''} 
                            onChange={e => setBusiness({...business!, phone: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium pr-10"
                          />
                          <VoiceDictation 
                            onResult={(text) => setBusiness({...business!, phone: text.replace(/\D/g, '')})}
                            className="absolute right-1 top-1/2 -translate-y-1/2 scale-75"
                          />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.contactEmail')}</label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={business?.email || ''} 
                            onChange={e => setBusiness({...business!, email: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium pr-10"
                          />
                          <VoiceDictation 
                            onResult={(text) => setBusiness({...business!, email: text.replace(/\s/g, '').toLowerCase()})}
                            className="absolute right-1 top-1/2 -translate-y-1/2 scale-75"
                          />
                        </div>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-2 pt-2">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.license')}</label>
                        <input 
                          type="text" 
                          value={business?.licenseNumber || ''} 
                          onChange={e => setBusiness({...business!, licenseNumber: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium font-mono"
                        />
                     </div>
                   </div>

                   <div className="space-y-1 pt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.website')}</label>
                      <input 
                        type="url" 
                        value={business?.website || ''} 
                        onChange={e => setBusiness({...business!, website: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        placeholder="www.yourcompany.com"
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <svg className="w-2.5 h-2.5 fill-blue-600" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        {t('settingsDetail.linkedin')}
                      </label>
                      <input 
                        type="url" 
                        value={business?.linkedIn || ''} 
                        onChange={e => setBusiness({...business!, linkedIn: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        placeholder="linkedin.com/company/..."
                      />
                   </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('settingsDetail.currentUser')}</h3>
                <div className="space-y-3">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.fullName')}</label>
                      <input 
                        type="text" 
                        value={user?.fullName || ''} 
                        onChange={e => setUser({...user!, fullName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.email')}</label>
                      <input 
                        type="email" 
                        value={user?.email || ''} 
                        onChange={e => setUser({...user!, email: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('settingsDetail.role')}</label>
                      <select 
                        value={user?.role || ''} 
                        onChange={e => setUser({...user!, role: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                      >
                         <option>{t('settingsDetail.fieldTechnician')}</option>
                         <option>{t('settingsDetail.leadInspector')}</option>
                         <option>{t('settingsDetail.projectManager')}</option>
                         <option>{t('settingsDetail.safetyOfficer')}</option>
                      </select>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest ml-1">{t('settingsDetail.adminPin')}</label>
                <input 
                  type="password"
                  maxLength={6}
                  value={business?.adminPin || ''}
                  onChange={e => setBusiness({...business!, adminPin: e.target.value.replace(/\D/g, '')})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono tracking-widest"
                  placeholder={t('settingsDetail.setPin')}
                />
                <p className="text-[9px] text-slate-400 italic ml-1">{t('settingsDetail.pinHelp')}</p>
             </div>
          </div>
          
          <div className="space-y-1 pt-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('settingsDetail.regulatoryFooter')}</label>
            <textarea 
              value={business?.regulatoryInfo || ''}
              onChange={e => setBusiness({...business!, regulatoryInfo: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium h-20"
              placeholder={t('settingsDetail.regulatoryPlaceholder')}
            />
          </div>
        </section>

        <CloudUpsellCard />

        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600/10 p-2 rounded-lg">
              <Cloud className="text-blue-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t('settingsDetail.cloudSync')}</h2>
          </div>
          
          <p className="text-sm text-slate-500 leading-relaxed italic">
            <span className="font-bold text-blue-600">{t('settingsDetail.enterpriseMode')}</span> {t('settingsDetail.cloudHelp')}
          </p>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('settingsDetail.workerUrl')}</label>
              <input
                type="url"
                placeholder="https://siteproof-api.workers.dev"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('settingsDetail.cloudKey')}</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            className={cn(
              "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
              saved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {saved ? <CheckCircle size={20} /> : <Save size={20} />}
            <span>{saved ? t('settingsDetail.configSaved') : t('settingsDetail.saveCloud')}</span>
          </button>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-600/10 p-2 rounded-lg">
              <MicIcon className="text-purple-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t('settingsDetail.speech')}</h2>
          </div>
          
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('settingsDetail.speechHelp')}
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                speechCalibrated ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300"
              )} />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {speechCalibrated ? t('settingsDetail.optimized') : t('settingsDetail.notCalibrated')}
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-black">
                  {speechCalibrated ? t('settingsDetail.voiceActive') : t('settingsDetail.defaultSettings')}
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/settings/speech')}
              className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
            >
              {speechCalibrated ? t('settingsDetail.retrain') : t('settingsDetail.startTraining')}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-green-500" />
                <span className="text-sm font-medium text-slate-700">{t('settingsDetail.offlineMode')}</span>
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">{t('settingsDetail.alwaysActive')}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{t('settingsDetail.archive')}</span>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {t('settingsDetail.offlineStorage')}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
