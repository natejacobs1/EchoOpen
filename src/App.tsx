import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveTab,
  Header,
} from './components/Header';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ConversationPanel } from './components/ConversationPanel';
import { VoiceControls } from './components/VoiceControls';
import { LatencyProfiler } from './components/LatencyProfiler';
import { ArchitectureView } from './components/ArchitectureView';
import { BenchmarksView } from './components/BenchmarksView';
import { CodeRepositoryView } from './components/CodeRepositoryView';
import { DemoGuideModal } from './components/DemoGuideModal';
import { SettingsModal } from './components/SettingsModal';
import {
  AssistantState,
  ChatMessage,
  Language,
  LatencyMetrics,
  PipelineConfig,
} from './types';
import { audioService } from './utils/audio';
import { voiceAssistantService } from './services/voiceAssistant';

const DEFAULT_CONFIG: PipelineConfig = {
  language: 'en',
  sttModel: 'faster-whisper-base',
  llmModel: 'qwen2.5-3b-instruct',
  ttsModel: 'kokoro-82m',
  ttsVoice: 'af_heart',
  vadSensitivity: 0.05,
  silenceThresholdMs: 1000,
  bargeInEnabled: true,
  streamingTtsEnabled: true,
  systemPrompt:
    'You are EchoOpen, an intelligent, concise, and helpful voice assistant built entirely on open-weight models. Keep your spoken responses brief (1-3 sentences), natural, and clear. Avoid formatting symbols.',
  localOllamaUrl: 'http://localhost:11434',
  localBackendUrl: 'http://localhost:8000',
  useLocalBackend: false,
  speechRate: 1.05,
  speechPitch: 1.0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [language, setLanguage] = useState<Language>('en');
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStreamingText, setCurrentStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [latestMetrics, setLatestMetrics] = useState<LatencyMetrics | null>(null);
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);

  // Audio & VAD realtime state
  const [vadEnergyDb, setVadEnergyDb] = useState<number>(-100);
  const [silenceCountdownPct, setSilenceCountdownPct] = useState<number>(0);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState<boolean>(false);

  // Refs for audio loops & recognition
  const recognitionRef = useRef<any>(null);
  const vadLoopRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechDetectedRef = useRef<boolean>(false);
  const currentTranscriptRef = useRef<string>('');

  // Update config language when top language changes
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setConfig((prev) => ({
      ...prev,
      language: lang,
      ttsModel: lang === 'hi' ? 'piper-hi-pratham' : prev.ttsModel,
    }));
  };

  // Barge-in interruption handler
  const handleBargeIn = useCallback(() => {
    voiceAssistantService.abortCurrentTurn();
    audioService.stopPlayback();
    setIsStreaming(false);
    setCurrentStreamingText('');
    setAssistantState('listening');
  }, []);

  // Speech Recognition initialization
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecClass) {
      console.warn('SpeechRecognition API not available in this browser');
      return null;
    }

    const recognition = new SpeechRecClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentTranscriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim || currentTranscriptRef.current) {
        speechDetectedRef.current = true;
      }
    };

    recognition.onerror = (e: any) => {
      console.warn('SpeechRecognition warning:', e.error);
    };

    return recognition;
  }, [language]);

  // Execute an assistant turn
  const executeTurn = async (userText: string) => {
    if (!userText.trim()) return;

    // 1. Add user turn
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAssistantState('llm_thinking');
    setIsStreaming(true);
    setCurrentStreamingText('');

    try {
      const response = await voiceAssistantService.processTurn(
        userText,
        messages,
        config,
        (token) => {
          setCurrentStreamingText((prev) => prev + token);
        },
        async (sentence) => {
          // Streaming sentence playback
          setAssistantState('tts_speaking');
          await audioService.playSpeech(
            sentence,
            config.language,
            config.speechRate,
            config.speechPitch,
            () => setAssistantState('tts_speaking'),
            () => {
              if (assistantState === 'tts_speaking') {
                setAssistantState('idle');
              }
            }
          );
        },
        (metrics) => {
          setLatestMetrics(metrics);
        }
      );

      setMessages((prev) => [...prev, response]);
      setIsStreaming(false);
      setCurrentStreamingText('');

      // If sentence streaming was not already spoken, play full response
      if (!response.interrupted) {
        setAssistantState('tts_speaking');
        await audioService.playSpeech(
          response.content,
          config.language,
          config.speechRate,
          config.speechPitch,
          () => setAssistantState('tts_speaking'),
          () => setAssistantState('idle')
        );
      } else {
        setAssistantState('idle');
      }
    } catch (err) {
      console.error('Error during turn execution:', err);
      setIsStreaming(false);
      setAssistantState('idle');
    }
  };

  // Real-time VAD monitoring loop
  const startVadMonitoring = useCallback(() => {
    const thresholdDb = -46; // Noise threshold
    const silenceTimeout = config.silenceThresholdMs;

    const vadTick = () => {
      const db = audioService.getEnergyDb();
      setVadEnergyDb(db);

      // Check for user speaking while assistant is speaking (Barge-in detection!)
      if (assistantState === 'tts_speaking' && config.bargeInEnabled && db > thresholdDb + 4) {
        handleBargeIn();
      }

      if (assistantState === 'listening' || assistantState === 'vad_detecting') {
        const hasVocalEnergy = db > thresholdDb;

        if (hasVocalEnergy) {
          // User is actively vocalizing
          speechDetectedRef.current = true;
          silenceStartRef.current = null;
          setSilenceCountdownPct(0);
          setAssistantState('vad_detecting');
        } else {
          // Below threshold
          if (speechDetectedRef.current) {
            // User had started speaking, now in silence gap
            const now = performance.now();
            if (!silenceStartRef.current) {
              silenceStartRef.current = now;
            }

            const elapsedSilence = now - silenceStartRef.current;
            const progress = Math.min(100, (elapsedSilence / silenceTimeout) * 100);
            setSilenceCountdownPct(progress);

            if (elapsedSilence >= silenceTimeout) {
              // Silence threshold reached! Commit user speech turn!
              speechDetectedRef.current = false;
              silenceStartRef.current = null;
              setSilenceCountdownPct(0);

              const finalSpeech = currentTranscriptRef.current.trim();
              currentTranscriptRef.current = '';

              if (finalSpeech) {
                setAssistantState('stt_processing');
                executeTurn(finalSpeech);
              } else {
                setAssistantState('listening');
              }
            }
          }
        }
      }

      vadLoopRef.current = requestAnimationFrame(vadTick);
    };

    vadLoopRef.current = requestAnimationFrame(vadTick);
  }, [assistantState, config.bargeInEnabled, config.silenceThresholdMs, handleBargeIn]);

  // Start microphone and speech pipeline
  const handleToggleMic = async () => {
    if (assistantState === 'listening' || assistantState === 'vad_detecting') {
      // Stop listening
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      audioService.stopMic();
      if (vadLoopRef.current) {
        cancelAnimationFrame(vadLoopRef.current);
      }
      setAssistantState('idle');
      speechDetectedRef.current = false;
      silenceStartRef.current = null;
      setSilenceCountdownPct(0);
    } else {
      // Start listening
      try {
        await audioService.initMic();
        currentTranscriptRef.current = '';
        speechDetectedRef.current = false;
        silenceStartRef.current = null;

        const rec = initSpeechRecognition();
        if (rec) {
          recognitionRef.current = rec;
          try {
            rec.start();
          } catch {}
        }

        setAssistantState('listening');
        startVadMonitoring();
      } catch (err) {
        console.warn('Microphone permission or access error:', err);
        // Fallback: stay idle, user can type or use sample prompts
        setAssistantState('idle');
      }
    }
  };

  // Replay speech audio from previous turn
  const handleReplayAudio = (text: string, lang: Language) => {
    setAssistantState('tts_speaking');
    audioService.playSpeech(
      text,
      lang,
      config.speechRate,
      config.speechPitch,
      () => setAssistantState('tts_speaking'),
      () => setAssistantState('idle')
    );
  };

  // Clear conversation history
  const handleClearHistory = () => {
    voiceAssistantService.abortCurrentTurn();
    audioService.stopPlayback();
    setMessages([]);
    setCurrentStreamingText('');
    setIsStreaming(false);
    setLatestMetrics(null);
    setAssistantState('idle');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioService.stopPlayback();
      audioService.stopMic();
      if (vadLoopRef.current) {
        cancelAnimationFrame(vadLoopRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
        onLanguageChange={handleLanguageChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
        isBackendConnected={config.useLocalBackend}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: VOICE STUDIO (Main Conversational Playground) */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Top Row: Visualizer & Real-time State */}
            <AudioVisualizer
              state={assistantState}
              vadEnergyDb={vadEnergyDb}
              vadThresholdDb={-46}
              isSpeaking={assistantState === 'tts_speaking'}
              silenceCountdownPct={silenceCountdownPct}
            />

            {/* Middle Row: Conversation Panel & Latency Profiler */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <ConversationPanel
                  messages={messages}
                  currentStreamingText={currentStreamingText}
                  isStreaming={isStreaming}
                  onReplayAudio={handleReplayAudio}
                  onClearHistory={handleClearHistory}
                  language={language}
                />
              </div>

              <div className="lg:col-span-5">
                <LatencyProfiler metrics={latestMetrics} />
              </div>
            </div>

            {/* Bottom Row: Voice & VAD Controls */}
            <VoiceControls
              state={assistantState}
              onToggleMic={handleToggleMic}
              onBargeIn={handleBargeIn}
              onSubmitText={executeTurn}
              config={config}
              onConfigChange={(updated) => setConfig((prev) => ({ ...prev, ...updated }))}
              language={language}
            />
          </div>
        )}

        {/* TAB 2: ARCHITECTURE & PIPELINE */}
        {activeTab === 'architecture' && <ArchitectureView />}

        {/* TAB 3: BENCHMARKS & HARDWARE */}
        {activeTab === 'benchmarks' && <BenchmarksView />}

        {/* TAB 4: SOURCE CODE & EXPORT */}
        {activeTab === 'code' && <CodeRepositoryView />}
      </main>

      {/* Modals */}
      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onSelectPrompt={(text, lang) => {
          handleLanguageChange(lang);
          setActiveTab('studio');
          executeTurn(text);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
      />
    </div>
  );
}
