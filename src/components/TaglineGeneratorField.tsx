import React, { useState } from 'react';
import { Sparkles, Loader2, Check, X, Wand2 } from 'lucide-react';
import { VoiceDictation } from './VoiceDictation';
import { AIService } from '../services/aiService';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface TaglineGeneratorFieldProps {
  value: string;
  companyName: string;
  onChange: (value: string) => void;
  isDark?: boolean;
}

export function TaglineGeneratorField({ value, companyName, onChange, isDark }: TaglineGeneratorFieldProps) {
  const { t } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (transcript?: string) => {
    if (!companyName) {
      setError(t('tagline.companyNameRequired'));
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const results = await AIService.generateTaglineOptions(companyName, transcript);
      setOptions(results);
    } catch (err) {
      setError(t('tagline.generateFailed'));
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-1">
      <label className={cn(
        "text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-1.5",
        isDark ? "text-slate-500" : "text-slate-500"
      )}>
        {t('tagline.label')}
        {isGenerating && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />}
      </label>
      
      <div className="relative">
        <input 
          type="text"
          placeholder={t('tagline.placeholder')}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            "w-full rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 transition-all pr-24 italic text-sm",
            isDark 
              ? "bg-white/5 border border-white/10 text-white focus:ring-blue-500/50" 
              : "bg-slate-50 border border-slate-200 text-slate-900 focus:ring-blue-500/10 focus:border-blue-500"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={() => handleGenerate()}
            className={cn(
              "p-2 rounded-lg transition-all hover:bg-blue-500/10 hover:text-blue-500",
              isDark ? "text-slate-500" : "text-slate-400"
            )}
            title={t('tagline.aiIdeas')}
          >
            <Wand2 size={16} />
          </button>
          <VoiceDictation 
            onResult={(text) => handleGenerate(text)}
            className={cn(
              "bg-transparent",
              isDark ? "text-blue-400" : "text-blue-600"
            )}
          />
        </div>
      </div>

      {options.length > 0 && (
        <div className={cn(
          "mt-2 p-3 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300",
          isDark ? "bg-white/5 border-white/10" : "bg-blue-50 border-blue-100"
        )}>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> {t('tagline.aiSuggestions')}
            </span>
            <button onClick={() => setOptions([])} className="text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  onChange(opt);
                  setOptions([]);
                }}
                className={cn(
                  "text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between group",
                  isDark 
                    ? "hover:bg-white/10 text-slate-300" 
                    : "hover:bg-white text-slate-700 shadow-sm border border-transparent hover:border-blue-200"
                )}
              >
                <span>{opt}</span>
                <Check size={12} className="text-green-500 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-2 text-center italic">
            {t('tagline.selectOrDictate')}
          </p>
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>
      )}
    </div>
  );
}
