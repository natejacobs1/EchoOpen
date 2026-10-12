import React from 'react';
import { Gauge, CheckCircle2, AlertTriangle, ArrowRight, Zap, Clock } from 'lucide-react';
import { LatencyMetrics } from '../types';

interface LatencyProfilerProps {
  metrics: LatencyMetrics | null;
}

export const LatencyProfiler: React.FC<LatencyProfilerProps> = ({ metrics }) => {
  const defaultMetrics: LatencyMetrics = {
    sttLatencyMs: 180,
    llmTTFTMs: 140,
    llmTotalMs: 460,
    ttsFirstChunkMs: 110,
    totalRoundtripMs: 430,
    tokensGenerated: 24,
    tokensPerSec: 48.2,
  };

  const activeMetrics = metrics || defaultMetrics;

  const maxScaleMs = 1200; // Benchmark threshold: conversational human tolerance is ~1000-1200ms
  const sttPct = Math.min(100, (activeMetrics.sttLatencyMs / maxScaleMs) * 100);
  const ttftPct = Math.min(100, (activeMetrics.llmTTFTMs / maxScaleMs) * 100);
  const ttsPct = Math.min(100, (activeMetrics.ttsFirstChunkMs / maxScaleMs) * 100);
  const totalPct = Math.min(100, (activeMetrics.totalRoundtripMs / maxScaleMs) * 100);

  const isExcellent = activeMetrics.totalRoundtripMs <= 700;
  const isAcceptable = activeMetrics.totalRoundtripMs <= 1200;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Live Latency & Profiler
            </h3>
            <p className="text-xs text-zinc-500">
              {metrics ? 'Measured from recent turn' : 'Baseline open-weights reference profile'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          {isExcellent ? (
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sub-second (Ultra-fast)
            </span>
          ) : isAcceptable ? (
            <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Natural Conversational
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              High latency
            </span>
          )}
        </div>
      </div>

      {/* Latency Waterfall Bar Chart */}
      <div className="space-y-3 pt-1">
        {/* Stage 1: Faster-Whisper STT */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-600 font-medium">
              1. STT (Faster-Whisper int8)
            </span>
            <span className="font-mono font-semibold text-zinc-900">
              {activeMetrics.sttLatencyMs} ms
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${sttPct}%` }}
            />
          </div>
        </div>

        {/* Stage 2: LLM TTFT */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-600 font-medium">
              2. LLM Time to First Token (Qwen 2.5 3B)
            </span>
            <span className="font-mono font-semibold text-zinc-900">
              {activeMetrics.llmTTFTMs} ms
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${ttftPct}%` }}
            />
          </div>
        </div>

        {/* Stage 3: TTS First Chunk */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-600 font-medium">
              3. TTS First Audio Chunk (Kokoro-82M / Piper)
            </span>
            <span className="font-mono font-semibold text-zinc-900">
              {activeMetrics.ttsFirstChunkMs} ms
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${ttsPct}%` }}
            />
          </div>
        </div>

        {/* End-to-End Roundtrip Total */}
        <div className="pt-2 border-t border-zinc-200">
          <div className="flex justify-between text-xs mb-1 font-semibold">
            <span className="text-zinc-900">
              Total End-to-End Roundtrip (Silence → Voice)
            </span>
            <span className="font-mono text-indigo-700 text-sm">
              {activeMetrics.totalRoundtripMs} ms
            </span>
          </div>
          <div className="relative h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
            <span>0 ms</span>
            <span className="font-medium text-emerald-600">Target: &lt; 1,200 ms</span>
            <span>1,200 ms</span>
          </div>
        </div>
      </div>

      {/* Auxiliary Statistics Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100 text-center">
        <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-200">
          <p className="text-[11px] text-zinc-500">LLM Speed</p>
          <p className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
            {activeMetrics.tokensPerSec} <span className="text-[10px] font-normal text-zinc-500">tok/s</span>
          </p>
        </div>
        <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-200">
          <p className="text-[11px] text-zinc-500">Tokens Emitted</p>
          <p className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
            {activeMetrics.tokensGenerated}
          </p>
        </div>
        <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-200">
          <p className="text-[11px] text-zinc-500">STT RTF</p>
          <p className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
            0.12x <span className="text-[10px] font-normal text-zinc-500">(Fast)</span>
          </p>
        </div>
      </div>
    </div>
  );
};
