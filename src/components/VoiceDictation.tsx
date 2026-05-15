import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface VoiceDictationProps {
  onResult: (text: string) => void;
  className?: string;
  isTextArea?: boolean;
}

export function VoiceDictation({ onResult, className, isTextArea }: VoiceDictationProps) {
  const { settings } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = settings.captureLanguage === 'es' ? 'es-PR' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    // In many implementations, just stopping the recognition object works, 
    // but we'll let the onend handle the state.
    setIsListening(false);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={cn(
        "p-2 rounded-xl transition-all active:scale-90 flex items-center justify-center",
        isListening 
          ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" 
          : "text-slate-400 hover:text-blue-600 hover:bg-slate-100",
        className
      )}
      title={isListening ? "Stop listening" : "Start dictation"}
    >
      {isListening ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
}
