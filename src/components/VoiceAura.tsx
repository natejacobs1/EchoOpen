import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';
import { audioService } from '../utils/audio';

interface VoiceAuraProps {
  state: AssistantState;
  vadEnergyDb: number;
  silenceCountdownPct: number;
  liveTranscript: string;
  isSpeaking: boolean;
  onInterrupt: () => void;
}

export const VoiceAura: React.FC<VoiceAuraProps> = ({
  state,
  vadEnergyDb,
  silenceCountdownPct,
  liveTranscript,
  isSpeaking,
  onInterrupt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const waveform = new Uint8Array(128);
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);
      phase += 0.03;

      if (state === 'listening' || state === 'vad_detecting') {
        audioService.getWaveformData(waveform);
        const energyNorm = Math.min(1, Math.max(0, (vadEnergyDb + 75) / 45));

        // Draw organic concentric aura rings
        const baseRadius = 38 + energyNorm * 22;
        for (let ring = 3; ring >= 1; ring--) {
          const r = baseRadius + ring * (12 + energyNorm * 10);
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = ring === 1
            ? `rgba(99, 102, 241, ${0.25 + energyNorm * 0.4})`
            : `rgba(99, 102, 241, ${0.08 + energyNorm * 0.15})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw smooth centered wave
        ctx.beginPath();
        const sliceWidth = (width * 0.7) / waveform.length;
        const startX = width * 0.15;
        for (let i = 0; i < waveform.length; i++) {
          const v = (waveform[i] - 128) / 128.0;
          const x = startX + i * sliceWidth;
          const y = centerY + v * 32 * (0.6 + energyNorm * 1.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = state === 'vad_detecting' ? '#4f46e5' : '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (state === 'tts_speaking' || isSpeaking) {
        // Expressive conversational voice ripples
        const baseRadius = 45;
        for (let i = 0; i < 3; i++) {
          const r = baseRadius + Math.sin(phase + i * 1.2) * 8 + i * 12;
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.25 - i * 0.06})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Voice speech wave
        ctx.beginPath();
        const waveWidth = width * 0.55;
        const startX = width * 0.225;
        const points = 60;
        for (let i = 0; i <= points; i++) {
          const x = startX + (i / points) * waveWidth;
          const envelope = Math.sin((i / points) * Math.PI);
          const y =
            centerY +
            (Math.sin(i * 0.25 + phase * 2) * 14 +
              Math.sin(i * 0.45 - phase * 1.5) * 8) *
              envelope;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (state === 'llm_thinking' || state === 'stt_processing') {
        // Calm pulsing orbital wave
        const r = 40 + Math.sin(phase * 2) * 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Idle gentle breathing line
        ctx.beginPath();
        const waveWidth = width * 0.4;
        const startX = width * 0.3;
        for (let i = 0; i <= 40; i++) {
          const x = startX + (i / 40) * waveWidth;
          const y = centerY + Math.sin(i * 0.15 + phase) * 3;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(161, 161, 170, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, vadEnergyDb, isSpeaking]);

  const getStatusLabel = () => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'vad_detecting':
        return 'Hearing you speak...';
      case 'stt_processing':
        return 'Understanding...';
      case 'llm_thinking':
        return 'Thinking...';
      case 'tts_speaking':
        return 'Speaking... (click to stop)';
      case 'idle':
      default:
        return 'Ready to talk';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-4 select-none">
      <div className="relative w-full max-w-sm h-32 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={128}
          className="w-full h-full block"
        />

        {/* Real-time transcribed speech bubble overlay */}
        {liveTranscript && (
          <div className="absolute inset-x-4 top-2 text-center pointer-events-none animate-in fade-in">
            <span className="inline-block bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-800 shadow-sm border border-zinc-200/80 max-w-xs truncate">
              "{liveTranscript}"
            </span>
          </div>
        )}
      </div>

      {/* Silence timeout countdown indicator */}
      {silenceCountdownPct > 0 && state === 'vad_detecting' && (
        <div className="w-24 h-1 bg-zinc-100 rounded-full overflow-hidden mt-1 mb-2">
          <div
            className="h-full bg-indigo-600 transition-all duration-75"
            style={{ width: `${silenceCountdownPct}%` }}
          />
        </div>
      )}

      {/* Minimal Status Label */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            state === 'tts_speaking'
              ? 'bg-emerald-500 animate-pulse'
              : state === 'listening' || state === 'vad_detecting'
              ? 'bg-indigo-600 animate-ping'
              : state === 'llm_thinking'
              ? 'bg-purple-500 animate-pulse'
              : 'bg-zinc-400'
          }`}
        />
        <button
          onClick={state === 'tts_speaking' ? onInterrupt : undefined}
          className={`${state === 'tts_speaking' ? 'hover:underline text-emerald-700 font-semibold' : ''}`}
        >
          {getStatusLabel()}
        </button>
      </div>
    </div>
  );
};
