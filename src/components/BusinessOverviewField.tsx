import React, { useState } from 'react';
import { Sparkles, Check, X, RefreshCw, Loader2 } from 'lucide-react';
import { VoiceDictation } from './VoiceDictation';
import { AIService } from '../services/aiService';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface BusinessOverviewFieldProps {
  value: string;
  companyName: string;
  onChange: (value: string) => void;
  isDark?: boolean;
}

export function BusinessOverviewField({ value, companyName, onChange, isDark }: BusinessOverviewFieldProps) {
  const { t } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewBio, setReviewBio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceResult = async (transcript: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const bio = await AIService.generateBusinessBio(transcript, companyName);
      setReviewBio(bio);
    } catch (err) {
      setError(t('businessOverview.generateFailed'));
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentBio = reviewBio !== null ? reviewBio : value;

  return (
    <div className="space-y-1">
      <label className={cn(
        "text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-1.5",
        isDark ? "text-slate-500" : "text-slate-500"
      )}>
        {t('businessOverview.label')}
        {isGenerating && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />}
      </label>
      
      <div className="relative group">
        <textarea 
          placeholder={t('businessOverview.placeholder')}
          value={currentBio}
          onChange={(e) => {
            if (reviewBio !== null) setReviewBio(e.target.value);
            else onChange(e.target.value);
          }}
          rows={3}
          className={cn(
            "w-full rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 transition-all text-sm",
            isDark 
              ? "bg-white/5 border border-white/10 text-white focus:ring-blue-500/50" 
              : "bg-slate-50 border border-slate-200 text-slate-900 focus:ring-blue-500/10 focus:border-blue-500",
            reviewBio !== null && "ring-2 ring-blue-500/50 border-blue-500",
            error && "ring-2 ring-red-500/50 border-red-500"
          )}
        />
        
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {reviewBio === null ? (
            <VoiceDictation 
              onResult={handleVoiceResult}
              className={cn(
                "p-2.5 rounded-xl bg-white/10 shadow-lg border border-white/10 hover:bg-white/20",
                isDark ? "bg-white/5 text-blue-400" : "bg-white text-blue-600 shadow-sm"
              )}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => {
                  onChange(reviewBio);
                  setReviewBio(null);
                }}
                className="p-1.5 rounded-lg bg-green-500 text-white shadow-lg hover:bg-green-600 transition-all scale-90"
                title={t('businessOverview.accept')}
              >
                <Check size={16} />
              </button>
              <button 
                onClick={() => setReviewBio(null)}
                className="p-1.5 rounded-lg bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all scale-90"
                title={t('businessOverview.reject')}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Hint Overlay */}
        {reviewBio === null && !value && (
          <div className={cn(
            "absolute bottom-3 left-5 pointer-events-none flex items-center gap-1.5",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            <Sparkles size={12} className="text-blue-500" />
            <span className="text-[10px] font-medium italic">
              {t('businessOverview.hint')}
            </span>
          </div>
        )}

        {reviewBio !== null && (
          <div className="absolute -top-7 right-0 left-0 flex justify-center">
            <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-bounce shadow-lg">
              {t('businessOverview.reviewSuggestion')}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-[10px] text-red-500 ml-1 font-medium italic">{error}</p>
      )}
    </div>
  );
}
