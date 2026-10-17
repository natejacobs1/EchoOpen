import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Language } from '../types';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onClearHistory: () => void;
  hasMessages: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  onClearHistory,
  hasMessages,
}) => {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-zinc-200/70 sticky top-0 z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-2xs">
          <svg
            className="w-4 h-4 stroke-[2]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 01-3-3V4.5a3 3 0 116 0v7.5a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 text-sm tracking-tight">Echo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Right controls: Language Toggle & Clear History */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 text-xs font-medium border border-zinc-200/60">
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              language === 'en'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('hi')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              language === 'hi'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            हिंदी
          </button>
        </div>

        {/* Clear Conversation */}
        {hasMessages && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-100 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </header>
  );
};
