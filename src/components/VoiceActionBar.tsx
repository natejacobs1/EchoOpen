import React, { useState } from 'react';
import { Mic, Square, ArrowUp, Check } from 'lucide-react';
import { AssistantState } from '../types';

interface VoiceActionBarProps {
  state: AssistantState;
  onToggleMic: () => void;
  onCommitTurn: () => void;
  onBargeIn: () => void;
  onSubmitText: (text: string) => void;
  language: 'en' | 'hi';
}

export const VoiceActionBar: React.FC<VoiceActionBarProps> = ({
  state,
  onToggleMic,
  onCommitTurn,
  onBargeIn,
  onSubmitText,
  language,
}) => {
  const [inputText, setInputText] = useState('');

  const isListening = state === 'listening' || state === 'vad_detecting';
  const isSpeaking = state === 'tts_speaking';
  const isProcessing = state === 'stt_processing' || state === 'llm_thinking';

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSubmitText(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (isSpeaking) {
      onBargeIn();
    } else if (isListening) {
      onCommitTurn();
    } else {
      onToggleMic();
    }
  };

  return (
    <div className="bg-white border-t border-zinc-200/80 px-4 py-4 sm:px-6 shadow-xs">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        {/* Main tactile Voice Button */}
        <button
          onClick={handleMicClick}
          disabled={isProcessing}
          className={`relative flex items-center justify-center shrink-0 w-12 h-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSpeaking
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400 animate-pulse shadow-md'
              : isListening
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-100 focus:ring-indigo-400 shadow-md'
              : 'bg-zinc-900 hover:bg-zinc-800 text-white focus:ring-zinc-400 shadow-sm'
          } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={
            isSpeaking
              ? 'Click to interrupt'
              : isListening
              ? 'Click to send voice now'
              : 'Click to start speaking'
          }
        >
          {isSpeaking ? (
            <Square className="w-4 h-4 fill-current" />
          ) : isListening ? (
            <Check className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <Mic className="w-5 h-5 stroke-[2]" />
          )}
        </button>

        {/* Text Input for typing alternative */}
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder={
              isListening
                ? language === 'hi' ? 'बोलिए, मैं सुन रहा हूँ...' : 'Listening to you speak...'
                : language === 'hi' ? 'यहाँ संदेश लिखें या बोलें...' : 'Type a message or press mic to speak...'
            }
            className="w-full bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white text-zinc-900 placeholder:text-zinc-400 text-sm rounded-full pl-4 pr-11 py-3 border border-zinc-200 focus:border-zinc-400 focus:outline-none transition-all shadow-2xs"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="absolute right-1.5 w-8 h-8 rounded-full bg-zinc-900 disabled:bg-zinc-200 text-white disabled:text-zinc-400 flex items-center justify-center transition-colors shadow-2xs"
            title="Send"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
