import React, { useState } from 'react';
import { PipelineConfig } from '../types';
import { X, Sliders, CheckCircle2, AlertCircle, RefreshCw, Cpu, Server } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PipelineConfig;
  onSaveConfig: (updated: PipelineConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<PipelineConfig>(config);
  const [testingOllama, setTestingOllama] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'failed'; message: string }>({
    status: 'idle',
    message: '',
  });

  if (!isOpen) return null;

  const handleTestOllama = async () => {
    setTestingOllama(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const res = await fetch(`${localConfig.localOllamaUrl}/api/tags`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name).join(', ') || 'Connected';
        setTestResult({
          status: 'success',
          message: `Connected! Available models: ${models}`,
        });
      } else {
        setTestResult({
          status: 'failed',
          message: `Ollama returned HTTP ${res.status}. Is Ollama running?`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'failed',
        message: `Could not reach ${localConfig.localOllamaUrl}. Ensure 'OLLAMA_ORIGINS="*" ollama serve' is running.`,
      });
    } finally {
      setTestingOllama(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-zinc-900">
              Pipeline Settings & Local Bridge
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Model Selection */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
              Open-Weight Model Configuration
            </h4>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Speech-to-Text Model (STT)
              </label>
              <select
                value={localConfig.sttModel}
                onChange={(e) => setLocalConfig({ ...localConfig, sttModel: e.target.value as any })}
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 text-xs"
              >
                <option value="faster-whisper-base">Faster-Whisper Base INT8 (145MB · Ultra-fast ~160ms)</option>
                <option value="faster-whisper-small">Faster-Whisper Small INT8 (480MB · Higher Accuracy ~240ms)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Language Model (LLM)
              </label>
              <select
                value={localConfig.llmModel}
                onChange={(e) => setLocalConfig({ ...localConfig, llmModel: e.target.value as any })}
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 text-xs"
              >
                <option value="qwen2.5-3b-instruct">Qwen 2.5 (3B-Instruct) · Best multilingual Hindi/English</option>
                <option value="llama-3.2-3b-instruct">Llama 3.2 (3B-Instruct) · Meta Open-Weight</option>
                <option value="gemma-2-2b-it">Gemma 2 (2B-IT) · Fast 58 tok/s</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Text-to-Speech Engine (TTS)
              </label>
              <select
                value={localConfig.ttsModel}
                onChange={(e) => setLocalConfig({ ...localConfig, ttsModel: e.target.value as any })}
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 text-xs"
              >
                <option value="kokoro-82m">Kokoro-82M ONNX (Natural prosody · 85ms first-chunk)</option>
                <option value="piper-en-lessac">Piper Neural (en_US-lessac)</option>
                <option value="piper-hi-pratham">Piper Neural Hindi (hi_IN-pratham native)</option>
              </select>
            </div>
          </div>

          {/* Local GPU / Ollama Connection Bridge */}
          <div className="pt-4 border-t border-zinc-200 space-y-3">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              <span>Local Host Connection (Optional Bridge)</span>
            </h4>

            <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
              <input
                type="checkbox"
                checked={localConfig.useLocalBackend}
                onChange={(e) => setLocalConfig({ ...localConfig, useLocalBackend: e.target.checked })}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-zinc-900 block">Bridge to Local Ollama Daemon</span>
                <span className="text-[11px] text-zinc-500">
                  When enabled, routes streaming completions directly to your local Ollama port.
                </span>
              </div>
            </label>

            {localConfig.useLocalBackend && (
              <div className="space-y-2">
                <label className="block font-medium text-zinc-700">
                  Local Ollama URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.localOllamaUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, localOllamaUrl: e.target.value })}
                    className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-zinc-800 font-mono text-xs"
                    placeholder="http://localhost:11434"
                  />
                  <button
                    type="button"
                    onClick={handleTestOllama}
                    disabled={testingOllama}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg font-medium text-zinc-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingOllama ? 'animate-spin' : ''}`} />
                    <span>Ping</span>
                  </button>
                </div>

                {testResult.status === 'success' && (
                  <p className="text-emerald-700 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{testResult.message}</span>
                  </p>
                )}
                {testResult.status === 'failed' && (
                  <p className="text-rose-700 flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3 h-3" />
                    <span>{testResult.message}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Speech Rate & Pitch */}
          <div className="pt-4 border-t border-zinc-200 space-y-3">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
              Audio Prosody
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between font-medium text-zinc-700 mb-1">
                  <span>Speech Rate</span>
                  <span className="font-mono">{localConfig.speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.1"
                  value={localConfig.speechRate}
                  onChange={(e) => setLocalConfig({ ...localConfig, speechRate: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-zinc-700 mb-1">
                  <span>Speech Pitch</span>
                  <span className="font-mono">{localConfig.speechPitch.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={localConfig.speechPitch}
                  onChange={(e) => setLocalConfig({ ...localConfig, speechPitch: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
