import React, { useState } from 'react';
import { Mic, MicOff, Square, Send, Zap, Sliders, Shield, VolumeX, Sparkles } from 'lucide-react';
import { AssistantState, Language, PipelineConfig } from '../types';

interface VoiceControlsProps {
  state: AssistantState;
  onToggleMic: () => void;
  onBargeIn: () => void;
  onSubmitText: (text: string) => void;
  config: PipelineConfig;
  onConfigChange: (updated: Partial<PipelineConfig>) => void;
  language: Language;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  onToggleMic,
  onBargeIn,
  onSubmitText,
  config,
  onConfigChange,
  language,
}) => {
  const [textInput, setTextInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isListening = state === 'listening' || state === 'vad_detecting';
  const isSpeaking = state === 'tts_speaking';
  const isProcessing = state === 'stt_processing' || state === 'llm_thinking';

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    onSubmitText(textInput.trim());
    setTextInput('');
  };

  const samplePrompts = language === 'hi' ? [
    { label: 'नमस्ते & परिचय', text: 'नमस्ते, आप कौन हैं और आपकी क्षमताएं क्या हैं?' },
    { label: 'भारत की राजधानी', text: 'भारत की राजधानी क्या है और इसकी खासियत बताइए?' },
    { label: 'ट्रांसफॉर्मर तकनीक', text: 'ट्रांसफॉर्मर मॉडल कैसे काम करता है संक्षेप में बताइए?' },
  ] : [
    { label: 'Transformer Attention', text: 'Explain transformer attention in two sentences.' },
    { label: 'Inventor context', text: 'Who first invented the transformer architecture?' },
    { label: 'Faster-Whisper Latency', text: 'How does Faster-Whisper achieve low latency?' },
    { label: 'Clean Code Rules', text: 'Give me 3 practical tips for writing clean code.' },
  ];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Primary Voice Action Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Main Microphone Button */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => {
              if (isSpeaking) {
                onBargeIn();
              } else {
                onToggleMic();
              }
            }}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-offset-2 ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-300 animate-pulse'
                : isListening
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300 ring-4 ring-indigo-100'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white focus:ring-zinc-300'
            }`}
            title={isSpeaking ? 'Click to interrupt assistant (Barge-in)' : isListening ? 'Click to stop listening' : 'Click to start voice'}
          >
            {isSpeaking ? (
              <Square className="w-6 h-6 fill-current" />
            ) : isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 text-base">
                {isSpeaking
                  ? 'Speaking (Click to Interrupt)'
                  : isListening
                  ? 'Listening to Microphone...'
                  : isProcessing
                  ? 'Processing Open-Weights...'
                  : 'Start Voice Conversation'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isSpeaking
                ? 'Barge-in active: speak or click button to cut in'
                : isListening
                ? 'Auto-detects silence via Web Audio VAD'
                : 'Microphone uses Faster-Whisper open-weight transcription'}
            </p>
          </div>
        </div>

        {/* Quick Barge-In Test Trigger */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isSpeaking && (
            <button
              onClick={onBargeIn}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
            >
              <VolumeX className="w-4 h-4 text-rose-600" />
              <span>Barge-In (Interrupt)</span>
            </button>
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showAdvanced
                ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>VAD Controls</span>
          </button>
        </div>
      </div>

      {/* Advanced VAD & Barge-in Controls Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-zinc-50 p-3 rounded-lg">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">
              Silence Timeout (VAD Commit)
            </label>
            <select
              value={config.silenceThresholdMs}
              onChange={(e) => onConfigChange({ silenceThresholdMs: Number(e.target.value) })}
              className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value={700}>700ms (Ultra-responsive)</option>
              <option value={1000}>1000ms (Recommended)</option>
              <option value={1400}>1400ms (Deliberate speaker)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">
              Barge-in (Live Interruption)
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={config.bargeInEnabled}
                onChange={(e) => onConfigChange({ bargeInEnabled: e.target.checked })}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-zinc-700 font-medium">Cut off AI playback on speech</span>
            </label>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">
              TTS Voice Preset
            </label>
            <select
              value={config.ttsModel}
              onChange={(e) => onConfigChange({ ttsModel: e.target.value as any })}
              className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="kokoro-82m">Kokoro-82M (Natural 24kHz)</option>
              <option value="piper-en-lessac">Piper (en_US-lessac neural)</option>
              <option value="piper-hi-pratham">Piper (hi_IN-pratham Hindi)</option>
            </select>
          </div>
        </div>
      )}

      {/* Quick Prompts Row */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Benchmark Prompts ({language === 'hi' ? 'हिंदी' : 'English'}):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSubmitText(p.text)}
              disabled={isProcessing}
              className="px-2.5 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors border border-zinc-200 text-left font-medium disabled:opacity-50"
            >
              {p.text}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Text Input Fallback */}
      <form onSubmit={handleTextSubmit} className="flex gap-2 pt-1">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={
            language === 'hi'
              ? 'यहाँ हिंदी में टाइप करें या ऊपर माइक दबाएं...'
              : 'Type prompt here or press microphone above...'
          }
          disabled={isProcessing}
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || isProcessing}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
