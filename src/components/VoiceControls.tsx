import React, { useState, useRef } from 'react';
import { Mic, MicOff, Square, Send, Sliders, VolumeX, Sparkles, Activity, Upload, CheckCircle2, Zap } from 'lucide-react';
import { AssistantState, Language, PipelineConfig } from '../types';

interface VoiceControlsProps {
  state: AssistantState;
  onToggleMic: () => void;
  onCommitTurn: () => void;
  onBargeIn: () => void;
  onSubmitText: (text: string) => void;
  config: PipelineConfig;
  onConfigChange: (updated: Partial<PipelineConfig>) => void;
  language: Language;
  onOpenDiagnostics?: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  onToggleMic,
  onCommitTurn,
  onBargeIn,
  onSubmitText,
  config,
  onConfigChange,
  language,
  onOpenDiagnostics,
}) => {
  const [textInput, setTextInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isListening = state === 'listening' || state === 'vad_detecting';
  const isVocalizing = state === 'vad_detecting';
  const isSpeaking = state === 'tts_speaking';
  const isProcessing = state === 'stt_processing' || state === 'llm_thinking';

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    onSubmitText(textInput.trim());
    setTextInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isProcessing) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType: file.type || 'audio/webm',
            language,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.text && data.text.trim()) {
            onSubmitText(data.text.trim());
            return;
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Audio file upload error:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              } else if (isListening) {
                // If currently listening, clicking commits speech immediately
                onCommitTurn();
              } else {
                onToggleMic();
              }
            }}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-offset-2 ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-300 animate-pulse'
                : isVocalizing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300 ring-4 ring-indigo-200 animate-pulse'
                : isListening
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300 ring-4 ring-indigo-100'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white focus:ring-zinc-300'
            }`}
            title={
              isSpeaking
                ? 'Click to interrupt assistant (Barge-in)'
                : isListening
                ? 'Click when done speaking to send voice immediately'
                : 'Click to start voice conversation'
            }
          >
            {isSpeaking ? (
              <Square className="w-6 h-6 fill-current" />
            ) : isListening ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 text-base">
                {isSpeaking
                  ? 'Speaking (Click to Interrupt)'
                  : isVocalizing
                  ? 'Detecting Voice... (Click to Send)'
                  : isListening
                  ? 'Listening... (Speak or Click to Send)'
                  : isProcessing
                  ? 'Processing Open-Weights Pipeline...'
                  : 'Start Voice Conversation'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isSpeaking
                ? 'Barge-in active: speak or click button to cut in'
                : isListening
                ? 'Auto-sends on silence, or click Done Speaking anytime'
                : 'Microphone uses Faster-Whisper open-weight transcription'}
            </p>
          </div>
        </div>

        {/* Action buttons: Done Speaking, Barge-In, VAD Controls, STT Diagnostics */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
          {/* Done Speaking Button for immediate submission */}
          {isListening && (
            <button
              onClick={onCommitTurn}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              title="Send speech immediately without waiting for silence timeout"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Done Speaking (Send)</span>
            </button>
          )}

          {isListening && (
            <button
              onClick={onToggleMic}
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              title="Stop listening and cancel turn"
            >
              <MicOff className="w-3.5 h-3.5 text-zinc-500" />
              <span>Cancel</span>
            </button>
          )}

          {isSpeaking && (
            <button
              onClick={onBargeIn}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
            >
              <VolumeX className="w-4 h-4 text-rose-600" />
              <span>Barge-In (Interrupt)</span>
            </button>
          )}

          {/* Turbo Latency Quick Toggle */}
          <button
            onClick={() => {
              const isCurrentlyTurbo = config.silenceThresholdMs <= 650 && config.speechRate >= 1.25;
              if (isCurrentlyTurbo) {
                onConfigChange({ silenceThresholdMs: 800, speechRate: 1.15 });
              } else {
                onConfigChange({ silenceThresholdMs: 600, speechRate: 1.25 });
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
              config.silenceThresholdMs <= 650
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
            title="Toggle Turbo Mode (600ms fast pause & 1.25x voice cadence)"
          >
            <Zap className={`w-3.5 h-3.5 ${config.silenceThresholdMs <= 650 ? 'fill-current' : 'text-amber-500'}`} />
            <span>{config.silenceThresholdMs <= 650 ? '⚡ Turbo: Active' : 'Turbo Mode'}</span>
          </button>

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

          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
              title="Test microphone and Speech-to-Text accuracy"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>STT Diagnostics</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced VAD & Latency Tuning Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs bg-zinc-50 p-3 rounded-lg">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">
              Silence Pause (Auto-Commit)
            </label>
            <select
              value={config.silenceThresholdMs}
              onChange={(e) => onConfigChange({ silenceThresholdMs: Number(e.target.value) })}
              className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value={600}>600ms (Turbo / Fast turn)</option>
              <option value={800}>800ms (Natural conversation - Recommended)</option>
              <option value={1100}>1100ms (Relaxed cadence)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">
              Voice Speed (Cadence)
            </label>
            <select
              value={config.speechRate}
              onChange={(e) => onConfigChange({ speechRate: Number(e.target.value) })}
              className="w-full bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value={1.0}>1.0x (Standard)</option>
              <option value={1.18}>1.18x (Fast & Natural)</option>
              <option value={1.28}>1.28x (Snappy Turbo)</option>
              <option value={1.4}>1.4x (High Speed)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">
              Streaming Audio TTS
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={config.streamingTtsEnabled}
                onChange={(e) => onConfigChange({ streamingTtsEnabled: e.target.checked })}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-zinc-700 font-medium">Speak 1st sentence immediately</span>
            </label>
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
              <span className="text-zinc-700 font-medium">Cut off speech when speaking</span>
            </label>
          </div>
        </div>
      )}

      {/* Quick Prompts Row */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Prompts ({language === 'hi' ? 'हिंदी' : 'English'}):</span>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-3 py-2 border border-zinc-300 hover:bg-zinc-100 rounded-lg text-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
          title="Upload Audio File (WAV, MP3, WebM)"
        >
          <Upload className="w-3.5 h-3.5 text-zinc-600" />
          <span className="hidden sm:inline">Upload Audio</span>
        </button>

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
