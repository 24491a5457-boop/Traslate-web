import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language, TranslationResponse } from '../../types';
import { AUTO_DETECT, getLanguageByCode } from '../../data/languages';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { ApiKeyAlert } from './ApiKeyAlert';
import { useToast } from '../../context/ToastContext';
import { speech } from '../../utils/speech';
import { saveTranslationHistoryItem } from '../../utils/storage';
import {
  ArrowLeftRight,
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Trash2,
  ClipboardPaste,
  Loader2,
  ChevronDown,
  CornerDownLeft
} from 'lucide-react';

interface TranslatorWorkspaceProps {
  onTranslationComplete?: () => void;
  presetTranslation?: {
    sourceText: string;
    sourceLang: string;
    targetLang: string;
  } | null;
}

const MAX_CHARACTERS = 5000;

export const TranslatorWorkspace: React.FC<TranslatorWorkspaceProps> = ({
  onTranslationComplete,
  presetTranslation,
}) => {
  const { toast } = useToast();

  // State
  const [sourceLang, setSourceLang] = useState<Language>(AUTO_DETECT);
  const [targetLang, setTargetLang] = useState<Language>(() => getLanguageByCode('te')); // default Telugu
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLangCode, setDetectedLangCode] = useState<string | null>(null);
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    error: string;
    details?: string;
    code?: string;
  } | null>(null);

  // Modal selector states
  const [modalType, setModalType] = useState<'source' | 'target' | null>(null);

  // Audio / Speech states
  const [isPlayingSourceSpeech, setIsPlayingSourceSpeech] = useState(false);
  const [isPlayingTargetSpeech, setIsPlayingTargetSpeech] = useState(false);

  // Copy success indicator
  const [isCopied, setIsCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle preset translation load (e.g., from History or Supported Languages click)
  useEffect(() => {
    if (presetTranslation) {
      setSourceText(presetTranslation.sourceText);
      setSourceLang(getLanguageByCode(presetTranslation.sourceLang));
      setTargetLang(getLanguageByCode(presetTranslation.targetLang));
      setTranslatedText('');
      setDetectedLangCode(null);
      setErrorInfo(null);
      // Focus textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [presetTranslation]);

  // Swap Languages
  const handleSwapLanguages = () => {
    if (sourceLang.code === 'auto') return;

    const previousSource = sourceLang;
    const previousTarget = targetLang;
    const previousInput = sourceText;
    const previousResult = translatedText;

    setSourceLang(previousTarget);
    setTargetLang(previousSource);

    if (previousResult) {
      setSourceText(previousResult);
      setTranslatedText(previousInput);
      setDetectedLangCode(null);
    }
  };

  // Main Translate handler
  const handleTranslate = useCallback(async () => {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      toast.warning('Input empty', 'Please enter text to translate.');
      return;
    }

    if (trimmed.length > MAX_CHARACTERS) {
      toast.error('Text too long', `Maximum character limit is ${MAX_CHARACTERS}.`);
      return;
    }

    setIsLoading(true);
    setErrorInfo(null);
    speech.stop();
    setIsPlayingSourceSpeech(false);
    setIsPlayingTargetSpeech(false);

    try {
      const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
          targetLang: targetLang.code,
          sourceLang: sourceLang.code === 'auto' ? undefined : sourceLang.code,
        }),
      });

      const data: TranslationResponse = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Translation request failed.';
        setErrorInfo({
          error: errorMsg,
          details: data.details,
          code: data.code,
        });
        toast.error('Translation Failed', errorMsg);
        return;
      }

      setTranslatedText(data.translatedText);
      setDetectedLangCode(data.detectedSourceLanguage || null);

      // Save to local history
      const detectedName = data.detectedSourceLanguage
        ? getLanguageByCode(data.detectedSourceLanguage).name
        : sourceLang.name;

      saveTranslationHistoryItem({
        sourceText: trimmed,
        translatedText: data.translatedText,
        sourceLang: sourceLang.code,
        sourceLangName: sourceLang.code === 'auto' ? `Auto (${detectedName})` : sourceLang.name,
        targetLang: targetLang.code,
        targetLangName: targetLang.name,
        detectedSourceLanguage: data.detectedSourceLanguage,
      });

      onTranslationComplete?.();
      toast.success('Translated successfully!');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error or backend function unavailable.';
      setErrorInfo({
        error: 'Unable to reach translation server.',
        details: msg,
        code: 'NETWORK_ERROR',
      });
      toast.error('Connection Error', 'Check your network or serverless function deployment.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, targetLang, sourceLang, toast, onTranslationComplete]);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to translate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && sourceText.trim()) {
        handleTranslate();
      }
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setIsCopied(true);
      toast.success('Copied to clipboard!', 'Translated text ready to paste.');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Copy failed', 'Please copy manually.');
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceText(prev => (prev ? prev + ' ' + text : text).slice(0, MAX_CHARACTERS));
        toast.info('Pasted from clipboard');
      }
    } catch {
      toast.warning('Clipboard access denied', 'Use Ctrl+V or Cmd+V to paste.');
    }
  };

  // Clear Source
  const handleClearSource = () => {
    setSourceText('');
    setDetectedLangCode(null);
    speech.stop();
    setIsPlayingSourceSpeech(false);
    textareaRef.current?.focus();
  };

  // Clear Result
  const handleClearResult = () => {
    setTranslatedText('');
    setDetectedLangCode(null);
    speech.stop();
    setIsPlayingTargetSpeech(false);
  };

  // Clear All
  const handleClearAll = () => {
    setSourceText('');
    setTranslatedText('');
    setDetectedLangCode(null);
    setErrorInfo(null);
    speech.stop();
    setIsPlayingSourceSpeech(false);
    setIsPlayingTargetSpeech(false);
    toast.info('Cleared all text');
  };

  // Text-To-Speech for Target
  const handleToggleTargetSpeech = () => {
    if (!translatedText) return;

    if (isPlayingTargetSpeech) {
      speech.stop();
      setIsPlayingTargetSpeech(false);
      return;
    }

    speech.stop();
    setIsPlayingSourceSpeech(false);

    const started = speech.speak(translatedText, targetLang.code, {
      onStart: () => setIsPlayingTargetSpeech(true),
      onEnd: () => setIsPlayingTargetSpeech(false),
      onError: (err) => {
        setIsPlayingTargetSpeech(false);
        toast.warning('Speech synthesis unavailable', err.message);
      },
    });

    if (!started) {
      setIsPlayingTargetSpeech(false);
    }
  };

  // Text-To-Speech for Source
  const handleToggleSourceSpeech = () => {
    if (!sourceText.trim()) return;

    if (isPlayingSourceSpeech) {
      speech.stop();
      setIsPlayingSourceSpeech(false);
      return;
    }

    speech.stop();
    setIsPlayingTargetSpeech(false);

    const langCode = detectedLangCode || (sourceLang.code === 'auto' ? 'en' : sourceLang.code);

    const started = speech.speak(sourceText, langCode, {
      onStart: () => setIsPlayingSourceSpeech(true),
      onEnd: () => setIsPlayingSourceSpeech(false),
      onError: (err) => {
        setIsPlayingSourceSpeech(false);
        toast.warning('Speech synthesis unavailable', err.message);
      },
    });

    if (!started) {
      setIsPlayingSourceSpeech(false);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      speech.stop();
    };
  }, []);

  const isSwapDisabled = sourceLang.code === 'auto' || isLoading;
  const detectedLanguageName = detectedLangCode ? getLanguageByCode(detectedLangCode).name : null;

  return (
    <section id="translator" className="relative py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Glassmorphism Card */}
        <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-brand-500/5 transition-all overflow-hidden">
          
          {/* Top Control Bar: Language Selection & Swapping */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Language Controls Group */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
              
              {/* Source Language Picker */}
              <button
                onClick={() => setModalType('source')}
                className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-brand-500 dark:hover:border-brand-500 shadow-sm text-sm font-semibold text-slate-800 dark:text-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] min-w-[140px] sm:min-w-[170px]"
              >
                <div className="flex items-center gap-2 truncate">
                  {sourceLang.code === 'auto' && (
                    <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shrink-0" />
                  )}
                  <span className="truncate">{sourceLang.name}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Swap Button */}
              <button
                onClick={handleSwapLanguages}
                disabled={isSwapDisabled}
                title={
                  sourceLang.code === 'auto'
                    ? 'Cannot swap when Auto Detect is active'
                    : 'Swap source and target languages'
                }
                className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                  isSwapDisabled
                    ? 'border-slate-200/50 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed bg-slate-100/40 dark:bg-slate-800/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500 bg-white dark:bg-slate-800 hover:rotate-180 shadow-sm hover:scale-105 active:scale-95'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              {/* Target Language Picker */}
              <button
                onClick={() => setModalType('target')}
                className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-brand-500 dark:hover:border-brand-500 shadow-sm text-sm font-semibold text-slate-800 dark:text-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] min-w-[140px] sm:min-w-[170px]"
              >
                <span className="truncate">{targetLang.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Quick Actions (Clear All) */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {(sourceText || translatedText) && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Clear source text and translation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Translation Body: 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
            
            {/* LEFT: SOURCE TEXT INPUT */}
            <div className="p-5 sm:p-6 flex flex-col justify-between min-h-[300px] sm:min-h-[360px]">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">
                  <span>Input ({sourceLang.name})</span>
                  {detectedLanguageName && (
                    <span className="text-brand-600 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full border border-brand-200/60 dark:border-brand-800/60">
                      Detected: {detectedLanguageName} ({detectedLangCode})
                    </span>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value.slice(0, MAX_CHARACTERS))}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter text to translate..."
                  rows={8}
                  className="w-full flex-1 bg-transparent border-0 resize-none text-base sm:text-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 leading-relaxed scrollbar-thin"
                />
              </div>

              {/* Source Bottom Toolbar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  {/* TTS for source text */}
                  {sourceText.trim() && (
                    <button
                      onClick={handleToggleSourceSpeech}
                      className={`p-2 rounded-xl transition-colors ${
                        isPlayingSourceSpeech
                          ? 'bg-brand-600 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title={isPlayingSourceSpeech ? 'Stop speech' : 'Listen to original text'}
                    >
                      {isPlayingSourceSpeech ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Paste button */}
                  <button
                    onClick={handlePaste}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>

                  {/* Clear text button */}
                  {sourceText && (
                    <button
                      onClick={handleClearSource}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Clear input"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Character counter */}
                <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
                  <span className={sourceText.length >= MAX_CHARACTERS ? 'text-rose-500 font-bold' : ''}>
                    {sourceText.length.toLocaleString()}
                  </span>
                  <span> / {MAX_CHARACTERS.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: TRANSLATION RESULT OUTPUT */}
            <div className="p-5 sm:p-6 flex flex-col justify-between min-h-[300px] sm:min-h-[360px] bg-slate-50/40 dark:bg-slate-800/20">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">
                  <span>Translation ({targetLang.name})</span>
                  {translatedText && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {translatedText.length} chars
                    </span>
                  )}
                </div>

                {/* Loading state shimmer or translated text */}
                <div className="flex-1 relative">
                  {isLoading ? (
                    <div className="space-y-3 pt-2 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-5/6"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2"></div>
                      <div className="pt-4 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Translating with MyMemory...</span>
                      </div>
                    </div>
                  ) : translatedText ? (
                    <div className="text-base sm:text-lg text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap select-text">
                      {translatedText}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm italic select-none">
                      Translation will appear here...
                    </div>
                  )}
                </div>
              </div>

              {/* Output Bottom Toolbar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  {/* TTS for target translated text */}
                  {translatedText && (
                    <button
                      onClick={handleToggleTargetSpeech}
                      className={`p-2 rounded-xl transition-colors ${
                        isPlayingTargetSpeech
                          ? 'bg-accent-600 text-white shadow-md'
                          : 'hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                      title={isPlayingTargetSpeech ? 'Stop speech' : 'Listen to translation'}
                    >
                      {isPlayingTargetSpeech ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Copy button */}
                  {translatedText && (
                    <button
                      onClick={handleCopy}
                      className={`p-2 rounded-xl transition-colors ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                      title="Copy translated text"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Clear result button */}
                  {translatedText && (
                    <button
                      onClick={handleClearResult}
                      className="p-2 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Clear translation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Translate Button Container */}
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                      Ctrl
                    </kbd>
                    +
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                      Enter
                    </kbd>
                    <CornerDownLeft className="w-3 h-3 ml-0.5" />
                  </span>

                  <button
                    onClick={handleTranslate}
                    disabled={isLoading || !sourceText.trim()}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md ${
                      isLoading || !sourceText.trim()
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-500/25 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-accent-200" />
                        <span>Translate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error / Missing API Key Notification Banner */}
          {errorInfo && (
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800">
              <ApiKeyAlert
                error={errorInfo.error}
                details={errorInfo.details}
                code={errorInfo.code}
                onDismiss={() => setErrorInfo(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Language Selector Modals */}
      <LanguageSelectorModal
        isOpen={modalType === 'source'}
        onClose={() => setModalType(null)}
        selectedCode={sourceLang.code}
        onSelect={lang => setSourceLang(lang)}
        title="Select Source Language"
        includeAutoDetect={true}
      />

      <LanguageSelectorModal
        isOpen={modalType === 'target'}
        onClose={() => setModalType(null)}
        selectedCode={targetLang.code}
        onSelect={lang => setTargetLang(lang)}
        title="Select Target Language"
        includeAutoDetect={false}
      />
    </section>
  );
};
