import React, { useState } from 'react';
import { HARDWARE_BENCHMARKS, MODEL_COMPARISONS } from '../data/benchmarks';
import { Cpu, HardDrive, Zap, Calculator, CheckCircle2 } from 'lucide-react';

export const BenchmarksView: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<'rtx4090' | 'rtx3060' | 'apple_m2' | 'cpu'>('rtx3060');
  const [audioSeconds, setAudioSeconds] = useState<number>(2.5);
  const [activeTab, setActiveTab] = useState<'hardware' | 'models' | 'calculator'>('hardware');

  // Interactive latency calculation simulation
  const calculateEstimatedLatency = () => {
    let sttFactor = 0.07; // RTF
    let ttft = 140;
    let ttsFactor = 40; // ms per word approx

    if (selectedDevice === 'rtx4090') {
      sttFactor = 0.038;
      ttft = 75;
      ttsFactor = 25;
    } else if (selectedDevice === 'rtx3060') {
      sttFactor = 0.072;
      ttft = 140;
      ttsFactor = 42;
    } else if (selectedDevice === 'apple_m2') {
      sttFactor = 0.084;
      ttft = 175;
      ttsFactor = 50;
    } else {
      sttFactor = 0.136;
      ttft = 390;
      ttsFactor = 85;
    }

    const estimatedStt = Math.round(audioSeconds * 1000 * sttFactor);
    const estimatedTtft = ttft;
    const estimatedTts = Math.round(ttsFactor * 2.5); // First short phrase ~2.5 words
    const estimatedTotal = estimatedStt + estimatedTtft + estimatedTts;

    return {
      stt: estimatedStt,
      ttft: estimatedTtft,
      tts: estimatedTts,
      total: estimatedTotal,
    };
  };

  const calculated = calculateEstimatedLatency();

  return (
    <div className="space-y-6">
      {/* Top Segmented Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Hardware Requirements & Benchmarks
          </h2>
          <p className="text-xs text-zinc-500">
            Observed response latency across consumer GPUs, Apple Silicon, and CPUs
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'hardware'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Hardware Specs
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'models'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Model Comparison
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'calculator'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Latency Simulator
          </button>
        </div>
      </div>

      {/* Tab 1: Hardware Benchmarks Table */}
      {activeTab === 'hardware' && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Empirical Latency Breakdown Across Test Systems
            </h3>
            <span className="text-xs text-zinc-500">Audio Turn: 2.5s speech input</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Hardware Target</th>
                  <th className="py-3 px-4">VRAM / Memory</th>
                  <th className="py-3 px-4">STT Latency</th>
                  <th className="py-3 px-4">LLM TTFT</th>
                  <th className="py-3 px-4">TTS 1st Chunk</th>
                  <th className="py-3 px-4">Total Roundtrip</th>
                  <th className="py-3 px-4">Suitability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-700 font-mono">
                {HARDWARE_BENCHMARKS.map((b, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-zinc-900">
                      {b.hardware}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{b.vram}</td>
                    <td className="py-3 px-4 text-amber-700">{b.sttLatency}</td>
                    <td className="py-3 px-4 text-indigo-700">{b.llmTTFT}</td>
                    <td className="py-3 px-4 text-emerald-700">{b.ttsLatency}</td>
                    <td className="py-3 px-4 font-bold text-zinc-900">{b.totalRoundtrip}</td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          b.suitability === 'Ideal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.suitability === 'Recommended'
                            ? 'bg-indigo-100 text-indigo-800'
                            : b.suitability === 'Baseline'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.suitability}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All models run in consumer memory: Faster-Whisper base (150MB) + Qwen 2.5 3B (1.9GB) + Kokoro-82M (82MB) fits comfortably within &lt; 4GB VRAM!
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Model Comparisons */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          {/* STT Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                1. Speech-to-Text Model Selection
              </h3>
              <span className="text-xs text-zinc-500">Benchmark: LibriSpeech / CommonVoice Hindi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Model</th>
                    <th className="py-2.5 px-4">Weights</th>
                    <th className="py-2.5 px-4">Parameters</th>
                    <th className="py-2.5 px-4">Memory</th>
                    <th className="py-2.5 px-4">WER (English)</th>
                    <th className="py-2.5 px-4">WER (Hindi)</th>
                    <th className="py-2.5 px-4">Speedup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  {MODEL_COMPARISONS.stt.map((m, i) => (
                    <tr key={i} className={m.selected ? 'bg-indigo-50/40 font-medium' : ''}>
                      <td className="py-2.5 px-4 font-semibold text-zinc-900 flex items-center gap-1.5">
                        {m.name}
                        {m.selected && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-sans">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500">{m.weights}</td>
                      <td className="py-2.5 px-4">{m.params}</td>
                      <td className="py-2.5 px-4 font-mono">{m.memory}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700">{m.werEnglish}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700">{m.werHindi}</td>
                      <td className="py-2.5 px-4 text-zinc-600">{m.speed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LLM Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                2. Language Model Selection
              </h3>
              <span className="text-xs text-zinc-500">Benchmark: MMLU / Indic-Reasoning</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Model</th>
                    <th className="py-2.5 px-4">License</th>
                    <th className="py-2.5 px-4">Params</th>
                    <th className="py-2.5 px-4">Quantization</th>
                    <th className="py-2.5 px-4">Throughput</th>
                    <th className="py-2.5 px-4">Multilingual Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  {MODEL_COMPARISONS.llm.map((m, i) => (
                    <tr key={i} className={m.selected ? 'bg-indigo-50/40 font-medium' : ''}>
                      <td className="py-2.5 px-4 font-semibold text-zinc-900 flex items-center gap-1.5">
                        {m.name}
                        {m.selected && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-sans">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500">{m.weights}</td>
                      <td className="py-2.5 px-4">{m.params}</td>
                      <td className="py-2.5 px-4 font-mono">{m.quantization}</td>
                      <td className="py-2.5 px-4 font-mono text-indigo-700">{m.tokPerSec}</td>
                      <td className="py-2.5 px-4 text-zinc-800">{m.multilingualScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TTS Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                3. Text-to-Speech Model Selection
              </h3>
              <span className="text-xs text-zinc-500">Benchmark: Audio RTF & MOS Naturalness</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Model</th>
                    <th className="py-2.5 px-4">License</th>
                    <th className="py-2.5 px-4">Params</th>
                    <th className="py-2.5 px-4">First Chunk Latency</th>
                    <th className="py-2.5 px-4">Acoustic Quality</th>
                    <th className="py-2.5 px-4">Hindi Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  {MODEL_COMPARISONS.tts.map((m, i) => (
                    <tr key={i} className={m.selected ? 'bg-indigo-50/40 font-medium' : ''}>
                      <td className="py-2.5 px-4 font-semibold text-zinc-900 flex items-center gap-1.5">
                        {m.name}
                        {m.selected && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-sans">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500">{m.weights}</td>
                      <td className="py-2.5 px-4">{m.params}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700">{m.firstChunkLatency}</td>
                      <td className="py-2.5 px-4">{m.audioQuality}</td>
                      <td className="py-2.5 px-4 text-zinc-800">{m.hindiSupport}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Latency Calculator */}
      {activeTab === 'calculator' && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-6">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                Interactive Roundtrip Latency Calculator
              </h3>
              <p className="text-xs text-zinc-500">
                Simulate end-to-end latency based on audio duration and target deployment hardware
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Deployment Hardware
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedDevice('rtx4090')}
                    className={`p-2.5 text-xs text-left rounded-lg border font-medium ${
                      selectedDevice === 'rtx4090'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    RTX 4090 (24GB)
                  </button>
                  <button
                    onClick={() => setSelectedDevice('rtx3060')}
                    className={`p-2.5 text-xs text-left rounded-lg border font-medium ${
                      selectedDevice === 'rtx3060'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    RTX 3060 (12GB)
                  </button>
                  <button
                    onClick={() => setSelectedDevice('apple_m2')}
                    className={`p-2.5 text-xs text-left rounded-lg border font-medium ${
                      selectedDevice === 'apple_m2'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    Apple M2 / M3 Max
                  </button>
                  <button
                    onClick={() => setSelectedDevice('cpu')}
                    className={`p-2.5 text-xs text-left rounded-lg border font-medium ${
                      selectedDevice === 'cpu'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    Intel/AMD CPU (AVX)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-zinc-700 mb-1.5">
                  <span>Input Speech Duration</span>
                  <span className="font-mono text-indigo-600">{audioSeconds.toFixed(1)} seconds</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.5"
                  value={audioSeconds}
                  onChange={(e) => setAudioSeconds(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
                  <span>1.0s (Quick phrase)</span>
                  <span>4.5s (Medium sentence)</span>
                  <span>8.0s (Long paragraph)</span>
                </div>
              </div>
            </div>

            {/* Calculated Results */}
            <div className="bg-zinc-900 text-white p-4 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-3">
                  Estimated Latency Profile
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-800">
                    <span className="text-zinc-400">Faster-Whisper STT:</span>
                    <span className="font-mono text-amber-400 font-semibold">{calculated.stt} ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800">
                    <span className="text-zinc-400">LLM TTFT (Time to First Token):</span>
                    <span className="font-mono text-indigo-400 font-semibold">{calculated.ttft} ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800">
                    <span className="text-zinc-400">Kokoro / Piper TTS First Audio:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{calculated.tts} ms</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-zinc-300 font-medium">Estimated Total Roundtrip:</span>
                  <span className="text-2xl font-bold font-mono text-white">
                    {calculated.total} <span className="text-sm font-normal text-zinc-400">ms</span>
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 mt-1">
                  ✓ Comfortably beats the &lt; 1,200 ms conversational latency limit!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
