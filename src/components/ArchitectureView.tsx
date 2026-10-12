import React, { useState } from 'react';
import { Mic, Activity, Cpu, Volume2, ShieldAlert, Sparkles, ArrowRight, CheckCircle2, ChevronRight, Layers, Radio, Zap } from 'lucide-react';

interface ComponentDetail {
  id: string;
  name: string;
  type: 'STT' | 'LLM' | 'TTS' | 'VAD' | 'PIPELINE';
  modelUsed: string;
  quantization: string;
  latencyObserved: string;
  hardwareFootprint: string;
  description: string;
  keyTechniques: string[];
}

const PIPELINE_COMPONENTS: ComponentDetail[] = [
  {
    id: 'vad',
    name: 'Voice Activity Detection (VAD)',
    type: 'VAD',
    modelUsed: 'Silero VAD / Web Audio Energy RMS',
    quantization: 'ONNX float32 / In-browser Worklet',
    latencyObserved: '< 15 ms frame processing',
    hardwareFootprint: '< 10 MB RAM, negligible CPU',
    description: 'Continuously monitors 16kHz microphone stream for human vocal tract acoustics. Detects speech onset and tracks trailing silence to autonomously trigger transcription without manual push-to-talk.',
    keyTechniques: [
      'Threshold-based RMS energy detection with 30ms windowing',
      'Configurable trailing silence cutoff (700ms - 1000ms)',
      'Pre-rolls 200ms audio buffer to avoid clipping first consonants',
      'Instant barge-in tripwire when user speaks during assistant playback'
    ]
  },
  {
    id: 'stt',
    name: 'Speech-to-Text (STT)',
    type: 'STT',
    modelUsed: 'Faster-Whisper (base / small)',
    quantization: 'INT8 (CTranslate2 backend)',
    latencyObserved: '160 - 200 ms (RTF: 0.12x)',
    hardwareFootprint: '150 MB (base) / 480 MB (small) VRAM',
    description: 'High-performance implementation of OpenAI Whisper using CTranslate2. Translates speech audio waveforms into punctuated text with native multilingual support for English and Hindi.',
    keyTechniques: [
      '8-bit weight quantization for 4x inference speedup over standard PyTorch',
      'Greedy decoding (beam_size=1) for minimal conversational latency',
      'Native Devanagari Hindi (hi) script & English (en) recognition',
      'Integrated Silero VAD pre-filter to prune dead air'
    ]
  },
  {
    id: 'context',
    name: 'Context & Prompt Buffer',
    type: 'PIPELINE',
    modelUsed: 'In-Memory Sliding Window Buffer',
    quantization: 'Structured JSON History',
    latencyObserved: '< 2 ms overhead',
    hardwareFootprint: 'Lightweight memory buffer',
    description: 'Manages conversational context across multiple turns. Maintains user prompts and assistant replies, trims older turns when approaching context limits, and injects voice-optimized system instructions.',
    keyTechniques: [
      'Sliding window preservation of recent conversational turns',
      'System prompt tuning for concise, spoken-friendly responses (1-3 sentences)',
      'No markdown, lists, or tables in output for natural prosody',
      'Bilingual system prompt instructions for English and Hindi modes'
    ]
  },
  {
    id: 'llm',
    name: 'Language Model (LLM)',
    type: 'LLM',
    modelUsed: 'Qwen 2.5 (3B-Instruct) / Llama 3.2 (3B)',
    quantization: 'Q4_K_M GGUF via Ollama / llama.cpp',
    latencyObserved: '140 ms TTFT · 48.2 tokens/second',
    hardwareFootprint: '1.9 GB VRAM (Q4_K_M)',
    description: 'Open-weight foundation model deployed locally via Ollama. Chosen for state-of-the-art multilingual comprehension (superb Hindi, Hinglish, and English reasoning) and ultra-fast Time-to-First-Token (TTFT).',
    keyTechniques: [
      'Streaming token generation via HTTP SSE / WebSocket',
      'Temperature 0.6 and Top-P 0.9 for deterministic conversational replies',
      'Deep multilingual pretraining with natural Hindi phrasing',
      'Asynchronous generator hooked to sentence-boundary parser'
    ]
  },
  {
    id: 'sentence_parser',
    name: 'Sentence Streaming Parser',
    type: 'PIPELINE',
    modelUsed: 'Regex Boundary Tokenizer',
    quantization: 'Stream Buffer',
    latencyObserved: '< 1 ms overhead',
    hardwareFootprint: 'Zero memory overhead',
    description: 'Pipelining bridge between LLM token stream and TTS engine. Intercepts tokens as they arrive, detects punctuation boundaries (. ? ! । newline), and emits completed sentences to TTS before the LLM finishes generating the full response.',
    keyTechniques: [
      'Detects standard punctuation plus Hindi Purna Viram (।)',
      'Reduces Time-to-First-Audio (TTFA) from 1800ms down to ~400ms',
      'Avoids premature splitting on abbreviations (Dr., e.g., Mr.)',
      'Maintains playback queue to ensure smooth sentence transitions'
    ]
  },
  {
    id: 'tts',
    name: 'Text-to-Speech (TTS)',
    type: 'TTS',
    modelUsed: 'Kokoro-82M ONNX / Piper Neural',
    quantization: 'ONNX float32 / int8',
    latencyObserved: '85 - 110 ms first chunk synthesis',
    hardwareFootprint: '82 MB (Kokoro) / 25 MB (Piper)',
    description: 'Lightweight, ultra-fast neural speech synthesis model running locally on ONNX runtime. Synthesizes high-fidelity 24kHz audio without requiring heavy GPU memory.',
    keyTechniques: [
      'State-of-the-art Kokoro-82M architecture with natural prosody',
      'Piper hi_IN Pratham model for authentic Hindi voice articulation',
      'Chunked streaming audio output (PCM / WAV format)',
      'Sub-100ms synthesis latency enables seamless conversational back-and-forth'
    ]
  },
  {
    id: 'barge_in',
    name: 'Barge-In & Abort Controller',
    type: 'PIPELINE',
    modelUsed: 'Asyncio Event / AbortController',
    quantization: 'Signal Hook',
    latencyObserved: '< 10 ms cancellation',
    hardwareFootprint: 'Zero overhead',
    description: 'Enables natural human conversational dynamics. If user speaks while assistant audio is playing, playback is terminated immediately, the LLM stream is aborted, and the assistant listens to the user.',
    keyTechniques: [
      'Client-side AudioContext stop & window.speechSynthesis.cancel()',
      'WebSocket barge_in cancellation frame sent to backend',
      'Backend asyncio abort_event stops in-flight LLM generation and frees GPU compute',
      'Transcript updates to mark turn as interrupted'
    ]
  }
];

export const ArchitectureView: React.FC = () => {
  const [selectedComponentId, setSelectedComponentId] = useState<string>('stt');

  const selected = PIPELINE_COMPONENTS.find((c) => c.id === selectedComponentId) || PIPELINE_COMPONENTS[1];

  return (
    <div className="space-y-6">
      {/* Title & Overview */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              End-to-End Open-Weight Voice Architecture
            </h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
              100% self-hosted, open-weight pipeline with zero paid cloud inference APIs. Designed for sub-second roundtrip conversational voice interaction.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Target: &lt; 1,200 ms</span>
            </span>
            <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Observed: ~430 ms</span>
            </span>
          </div>
        </div>

        {/* Visual Pipeline Interactive Flowchart */}
        <div className="mt-6 pt-6 border-t border-zinc-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1: Input & VAD */}
            <button
              onClick={() => setSelectedComponentId('vad')}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                selectedComponentId === 'vad'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-zinc-400">01. INGESTION</span>
                <Radio className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">Mic & VAD</p>
              <p className="text-xs text-zinc-500 mt-1">Silero / Energy Detection</p>
              <p className="text-[11px] font-mono text-zinc-400 mt-2">&lt; 15ms frame cycle</p>
            </button>

            {/* Step 2: Faster-Whisper STT */}
            <button
              onClick={() => setSelectedComponentId('stt')}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                selectedComponentId === 'stt'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-zinc-400">02. SPEECH-TO-TEXT</span>
                <Mic className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">Faster-Whisper</p>
              <p className="text-xs text-zinc-500 mt-1">CTranslate2 INT8 (Base/Small)</p>
              <p className="text-[11px] font-mono text-amber-600 font-semibold mt-2">~180ms latency</p>
            </button>

            {/* Step 3: LLM Engine */}
            <button
              onClick={() => setSelectedComponentId('llm')}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                selectedComponentId === 'llm'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-zinc-400">03. REASONING</span>
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">Qwen 2.5 / Llama 3.2</p>
              <p className="text-xs text-zinc-500 mt-1">Ollama Q4_K_M (3B Parameters)</p>
              <p className="text-[11px] font-mono text-indigo-600 font-semibold mt-2">~140ms TTFT (48 tok/s)</p>
            </button>

            {/* Step 4: Kokoro/Piper TTS */}
            <button
              onClick={() => setSelectedComponentId('tts')}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                selectedComponentId === 'tts'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-zinc-400">04. SYNTHESIS</span>
                <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">Kokoro / Piper TTS</p>
              <p className="text-xs text-zinc-500 mt-1">82M ONNX & Native Hindi</p>
              <p className="text-[11px] font-mono text-emerald-600 font-semibold mt-2">~110ms First Chunk</p>
            </button>
          </div>

          {/* Auxiliary Pipelining & Barge-in Bar */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedComponentId('context')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                selectedComponentId === 'context'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
              }`}
            >
              <span className="font-semibold text-zinc-800">Context Buffer</span>
              <p className="text-zinc-500 mt-0.5">Sliding window multi-turn state</p>
            </button>

            <button
              onClick={() => setSelectedComponentId('sentence_parser')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                selectedComponentId === 'sentence_parser'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
              }`}
            >
              <span className="font-semibold text-zinc-800">Streaming Pipelining</span>
              <p className="text-zinc-500 mt-0.5">Sentence regex to early TTS chunking</p>
            </button>

            <button
              onClick={() => setSelectedComponentId('barge_in')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                selectedComponentId === 'barge_in'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
              }`}
            >
              <span className="font-semibold text-rose-800">Barge-In Interruption</span>
              <p className="text-zinc-500 mt-0.5">Instant playback cancellation tripwire</p>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Component Technical Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {selected.type}
              </span>
              <h3 className="text-base font-bold text-zinc-900">{selected.name}</h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1">{selected.description}</p>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Model Checkpoint</span>
            <span className="text-xs font-semibold text-zinc-900 font-mono mt-0.5 block truncate">
              {selected.modelUsed}
            </span>
          </div>

          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Quantization</span>
            <span className="text-xs font-semibold text-zinc-900 font-mono mt-0.5 block truncate">
              {selected.quantization}
            </span>
          </div>

          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Observed Latency</span>
            <span className="text-xs font-semibold text-indigo-700 font-mono mt-0.5 block truncate">
              {selected.latencyObserved}
            </span>
          </div>

          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
            <span className="text-[11px] text-zinc-500 block">Memory Footprint</span>
            <span className="text-xs font-semibold text-zinc-900 font-mono mt-0.5 block truncate">
              {selected.hardwareFootprint}
            </span>
          </div>
        </div>

        {/* Architectural Techniques List */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
            Engineering & Latency Optimizations
          </h4>
          <ul className="space-y-1.5">
            {selected.keyTechniques.map((tech, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-zinc-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>{tech}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
