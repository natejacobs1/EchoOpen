import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';
import { audioService } from '../utils/audio';

interface AudioVisualizerProps {
  state: AssistantState;
  vadEnergyDb: number;
  vadThresholdDb: number;
  isSpeaking: boolean;
  silenceCountdownPct?: number; // 0 to 100
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  state,
  vadEnergyDb,
  vadThresholdDb,
  isSpeaking,
  silenceCountdownPct = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const waveformBuffer = new Uint8Array(128);
    const freqBuffer = new Uint8Array(64);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#05070c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid line in the middle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (state === 'listening' || state === 'vad_detecting') {
        audioService.getWaveformData(waveformBuffer);
        audioService.getFrequencyData(freqBuffer);

        // Draw frequency bars at the bottom
        const barWidth = width / freqBuffer.length;
        for (let i = 0; i < freqBuffer.length; i++) {
          const barHeight = (freqBuffer[i] / 255) * (height * 0.45);
          const x = i * barWidth;
          const y = height - barHeight;

          const barGrad = ctx.createLinearGradient(x, y, x, height);
          if (state === 'vad_detecting') {
            barGrad.addColorStop(0, '#6366f1');
            barGrad.addColorStop(1, 'rgba(99, 102, 241, 0.1)');
          } else {
            barGrad.addColorStop(0, '#38bdf8');
            barGrad.addColorStop(1, 'rgba(56, 189, 248, 0.1)');
          }
          ctx.fillStyle = barGrad;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        }

        // Draw active waveform
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = state === 'vad_detecting' ? '#a5b4fc' : '#7dd3fc';
        ctx.shadowColor = state === 'vad_detecting' ? '#818cf8' : '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / waveformBuffer.length;
        let x = 0;
        for (let i = 0; i < waveformBuffer.length; i++) {
          const v = waveformBuffer[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (state === 'tts_speaking' || isSpeaking) {
        // Synthesizer voice wave simulation
        const time = performance.now() * 0.005;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const points = 120;
        const step = width / points;
        for (let i = 0; i <= points; i++) {
          const px = i * step;
          const envelope = Math.sin((i / points) * Math.PI);
          const py =
            height / 2 +
            Math.sin(i * 0.2 + time) * 18 * envelope +
            Math.sin(i * 0.4 - time * 1.5) * 10 * envelope;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (state === 'stt_processing' || state === 'llm_thinking') {
        // Thinking / Transcribing pulse wave
        const time = performance.now() * 0.003;
        ctx.lineWidth = 2;
        ctx.strokeStyle = state === 'stt_processing' ? '#f59e0b' : '#a855f7';
        ctx.beginPath();

        const points = 80;
        const step = width / points;
        for (let i = 0; i <= points; i++) {
          const px = i * step;
          const py =
            height / 2 + Math.sin(i * 0.15 + time) * 6 * Math.sin((i / points) * Math.PI);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, isSpeaking]);

  const getStateDetails = () => {
    switch (state) {
      case 'listening':
        return {
          title: 'Listening for Speech',
          desc: 'Speak naturally into microphone · Web Audio VAD active',
          color: 'text-sky-400',
          dot: 'bg-sky-400',
        };
      case 'vad_detecting':
        return {
          title: 'Voice Activity Detected',
          desc: `User speaking · Silence trigger in progress`,
          color: 'text-indigo-400',
          dot: 'bg-indigo-400',
        };
      case 'stt_processing':
        return {
          title: 'Faster-Whisper Processing',
          desc: 'Running CTranslate2 INT8 model inference...',
          color: 'text-amber-400',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'llm_thinking':
        return {
          title: 'Open-Weight LLM Reasoning',
          desc: 'Streaming tokens from Qwen 2.5 / Llama 3.2 via Ollama...',
          color: 'text-purple-400',
          dot: 'bg-purple-400 animate-pulse',
        };
      case 'tts_speaking':
        return {
          title: 'Kokoro / Piper Audio Streaming',
          desc: 'Synthesizing voice response · Barge-in active',
          color: 'text-emerald-400',
          dot: 'bg-emerald-400',
        };
      case 'idle':
      default:
        return {
          title: 'Assistant Standby',
          desc: 'Click microphone or spacebar to speak',
          color: 'text-zinc-400',
          dot: 'bg-zinc-500',
        };
    }
  };

  const stateInfo = getStateDetails();

  return (
    <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-md">
      {/* Visualizer Canvas */}
      <div className="relative h-32 sm:h-36 w-full">
        <canvas
          ref={canvasRef}
          width={640}
          height={144}
          className="w-full h-full block"
        />

        {/* Silence Progress Bar overlay when VAD is detecting speech & waiting for pause */}
        {silenceCountdownPct > 0 && state === 'vad_detecting' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-75"
              style={{ width: `${silenceCountdownPct}%` }}
            />
          </div>
        )}

        {/* Energy meter in the corner */}
        <div className="absolute bottom-2 right-3 flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
          <span>dB: {vadEnergyDb > -90 ? Math.round(vadEnergyDb) : '-∞'}</span>
          <span className="text-zinc-600">|</span>
          <span>Threshold: {vadThresholdDb}dB</span>
        </div>
      </div>

      {/* State Banner */}
      <div className="px-4 py-2.5 bg-zinc-900 flex items-center justify-between border-t border-zinc-800 text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${stateInfo.dot}`} />
          <span className={`font-semibold ${stateInfo.color}`}>{stateInfo.title}</span>
          <span className="text-zinc-600 hidden sm:inline">·</span>
          <span className="text-zinc-400 hidden sm:inline">{stateInfo.desc}</span>
        </div>

        {/* Barge-in badge indicator */}
        {state === 'tts_speaking' && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            <span>Barge-in ready</span>
          </div>
        )}
      </div>
    </div>
  );
};
