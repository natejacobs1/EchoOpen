import React from 'react';
import { Mic, Activity, Cpu, Code2, Video, Settings as SettingsIcon, Languages } from 'lucide-react';
import { Language } from '../types';

export type ActiveTab = 'studio' | 'architecture' | 'benchmarks' | 'code' | 'demo';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSettings: () => void;
  onOpenDemoGuide: () => void;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
  onOpenSettings,
  onOpenDemoGuide,
}) => {
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Mic className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 tracking-tight text-base sm:text-lg">
                  EchoOpen Voice AI
                </span>
                <span className="hidden sm:inline-block text-xs font-mono text-zinc-500">
                  v1.0 · Open-Weight
                </span>
              </div>
              <p className="text-xs text-zinc-500 hidden md:block">
                Faster-Whisper · Qwen 2.5 / Llama 3.2 · Kokoro-82M / Piper
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => onTabChange('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'studio'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Studio</span>
            </button>

            <button
              onClick={() => onTabChange('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'architecture'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Architecture</span>
            </button>

            <button
              onClick={() => onTabChange('benchmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'benchmarks'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Benchmarks</span>
            </button>

            <button
              onClick={() => onTabChange('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'code'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Code</span>
            </button>
          </nav>

          {/* Actions & Language */}
          <div className="flex items-center gap-2">
            {/* Language Toggle (Hindi / English) */}
            <div className="flex items-center border border-zinc-200 rounded-lg p-0.5 bg-zinc-50">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  language === 'en'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="English language mode"
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('hi')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  language === 'hi'
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold text-indigo-700'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="Hindi language mode (हिंदी)"
              >
                हिंदी
              </button>
            </div>

            {/* Demo Walkthrough Button */}
            <button
              onClick={onOpenDemoGuide}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
              title="2-3 min demonstration video walkthrough script"
            >
              <Video className="w-3.5 h-3.5 text-indigo-600" />
              <span>Demo Guide</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
              title="Pipeline Configuration"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
