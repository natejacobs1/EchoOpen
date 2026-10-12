import React from 'react';
import { DEMO_SCRIPT_STEPS } from '../data/benchmarks';
import { X, Video, CheckCircle2, Clock, PlayCircle, MessageSquare } from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string, lang: 'en' | 'hi') => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                2–3 Minute Demonstration Video Script
              </h3>
              <p className="text-xs text-zinc-500">
                Structured walkthrough script & evaluator verification checklist
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rubric Verification Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
              Assignment Rubric Verification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>STT: Faster-Whisper int8 (Open-weight)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>LLM: Qwen 2.5 / Llama 3.2 via Ollama</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>TTS: Kokoro-82M / Piper (Open-weight)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero paid/hosted cloud AI APIs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Real-time VAD & Barge-in interruptions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bilingual: Hindi (हिंदी) & English</span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Script */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Timestamped Recording Script
            </h4>

            {DEMO_SCRIPT_STEPS.map((step, idx) => (
              <div key={idx} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-700 font-mono">
                    {step.step}
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">
                    {step.objective}
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-700">
                  {step.talkingPoints.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="text-zinc-400 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {/* Quick trigger button for step if applicable */}
                {idx === 1 && (
                  <button
                    onClick={() => {
                      onSelectPrompt('Can you briefly explain what transformer attention is in two sentences?', 'en');
                      onClose();
                    }}
                    className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Test English turn now</span>
                  </button>
                )}

                {idx === 3 && (
                  <button
                    onClick={() => {
                      onSelectPrompt('नमस्ते, आप मेरी किस प्रकार सहायता कर सकते हैं?', 'hi');
                      onClose();
                    }}
                    className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Test Hindi turn now</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
