import { useState, useRef, useEffect, useCallback } from 'react';
import {
  AssistantState,
  ChatMessage,
  Language,
  PipelineConfig,
} from './types';
import { audioService } from './utils/audio';
import { voiceAssistantService } from './services/voiceAssistant';
import { Navbar } from './components/Navbar';
import { VoiceAura } from './components/VoiceAura';
import { ConversationStream } from './components/ConversationStream';
import { VoiceActionBar } from './components/VoiceActionBar';

const DEFAULT_CONFIG: PipelineConfig = {
  language: 'en',
  sttModel: 'faster-whisper-base',
  llmModel: 'qwen2.5-3b-instruct',
  ttsModel: 'kokoro-82m',
  ttsVoice: 'af_heart',
  vadSensitivity: 0.05,
  silenceThresholdMs: 800,
  bargeInEnabled: true,
  streamingTtsEnabled: true,
  systemPrompt:
    'You are Echo, a thoughtful, direct voice companion. Respond in 1 to 2 conversational, natural sentences for speech output. Avoid formatting symbols.',
  localOllamaUrl: 'http://localhost:11434',
  localBackendUrl: 'http://localhost:8000',
  useLocalBackend: false,
  speechRate: 1.15,
  speechPitch: 1.0,
};

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const stateRef = useRef<AssistantState>('idle');

  const updateState = useCallback((newState: AssistantState) => {
    stateRef.current = newState;
    setAssistantState(newState);
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStreamingText, setCurrentStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);

  // Audio & VAD realtime state
  const [vadEnergyDb, setVadEnergyDb] = useState<number>(-100);
  const [silenceCountdownPct, setSilenceCountdownPct] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);

  // Refs for audio loops & recognition
  const recognitionRef = useRef<any>(null);
  const vadLoopRef = useRef<number | null>(null);
  const noiseFloorRef = useRef<number | null>(null);
  const lastVocalTimestampRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const currentTranscriptRef = useRef<string>('');
  const latestInterimRef = useRef<string>('');
  const latestIsFinalRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const speechStartTimeRef = useRef<number | null>(null);

  // Language switch handler
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
    updateState('listening');
  }, [updateState]);

  // Speech Recognition initialization
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecClass) {
      return null;
    }

    try {
      const recognition = new SpeechRecClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscriptRef.current += event.results[i][0].transcript + ' ';
            latestInterimRef.current = '';
            latestIsFinalRef.current = true;
          } else {
            interim += event.results[i][0].transcript;
            latestInterimRef.current = interim;
            latestIsFinalRef.current = false;
          }
        }
        const combined = (currentTranscriptRef.current + ' ' + interim).trim();
        setLiveTranscript(combined);
        if (combined) {
          hasSpokenRef.current = true;
          lastVocalTimestampRef.current = Date.now();
          if (!speechStartTimeRef.current) {
            speechStartTimeRef.current = Date.now();
          }
          if (stateRef.current === 'listening') {
            updateState('vad_detecting');
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setMicError('Microphone permission blocked. Please allow mic access in your browser bar.');
        } else if (e.error === 'audio-capture') {
          setMicError('No microphone detected.');
        }
      };

      recognition.onend = () => {
        if (
          isListeningRef.current &&
          stateRef.current !== 'stt_processing' &&
          stateRef.current !== 'llm_thinking' &&
          stateRef.current !== 'tts_speaking'
        ) {
          try {
            recognition.start();
          } catch {}
        }
      };

      return recognition;
    } catch {
      return null;
    }
  }, [language, updateState]);

  // Execute an assistant turn (conversational reply + streaming speech playback)
  const executeTurn = async (userText: string) => {
    if (!userText.trim()) {
      updateState(isListeningRef.current ? 'listening' : 'idle');
      return;
    }

    updateState('stt_processing');

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    updateState('llm_thinking');
    setIsStreaming(true);
    setCurrentStreamingText('');

    try {
      let streamingSpeechStarted = false;

      const response = await voiceAssistantService.processTurn(
        userText,
        messages,
        config,
        (token) => {
          setCurrentStreamingText((prev) => prev + token);
        },
        (sentence) => {
          if (config.streamingTtsEnabled && sentence.trim()) {
            if (!streamingSpeechStarted) {
              streamingSpeechStarted = true;
              updateState('tts_speaking');
            }
            audioService.enqueueSentence(
              sentence,
              config.language,
              config.speechRate,
              config.speechPitch,
              () => updateState('tts_speaking')
            );
          }
        }
      );

      setMessages((prev) => [...prev, response]);
      setIsStreaming(false);
      setCurrentStreamingText('');

      // Wait until assistant finishes speaking all queued sentences
      if (streamingSpeechStarted) {
        await audioService.waitForQueueComplete();
      } else if (!response.interrupted && response.content) {
        updateState('tts_speaking');
        await audioService.playSpeech(
          response.content,
          config.language,
          config.speechRate,
          config.speechPitch,
          () => updateState('tts_speaking')
        );
      }

      // Smoothly return to listening if session was active
      if (isListeningRef.current) {
        try {
          await audioService.initMic();
          audioService.startSpeechCapture();
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
          updateState('listening');
        } catch {
          updateState('idle');
        }
      } else {
        updateState('idle');
      }
    } catch (err) {
      console.error('Turn execution note:', err);
      setIsStreaming(false);
      updateState(isListeningRef.current ? 'listening' : 'idle');
    }
  };

  // Commit current speech turn
  const commitSpeechTurn = useCallback(async (forcedText?: string) => {
    const currentState = stateRef.current;
    if (
      currentState === 'stt_processing' ||
      currentState === 'llm_thinking' ||
      currentState === 'tts_speaking'
    ) {
      return;
    }

    updateState('stt_processing');
    setSilenceCountdownPct(0);
    hasSpokenRef.current = false;
    lastVocalTimestampRef.current = 0;
    speechStartTimeRef.current = null;
    latestIsFinalRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    let speechText = (forcedText || currentTranscriptRef.current + ' ' + latestInterimRef.current).trim();
    currentTranscriptRef.current = '';
    latestInterimRef.current = '';
    setLiveTranscript('');

    if (speechText) {
      audioService.stopSpeechCapture();
      await executeTurn(speechText);
      return;
    }

    const capturedBlob = await audioService.stopSpeechCapture();

    if (!speechText && capturedBlob && capturedBlob.size > 1500) {
      try {
        const base64 = await audioService.blobToBase64(capturedBlob);
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType: capturedBlob.type || 'audio/webm',
            language: config.language,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text && data.text.trim()) {
            speechText = data.text.trim();
          }
        }
      } catch (err) {
        console.warn('Transcription request note:', err);
      }
    }

    if (speechText) {
      await executeTurn(speechText);
    } else {
      if (isListeningRef.current) {
        audioService.startSpeechCapture();
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
        updateState('listening');
      } else {
        updateState('idle');
      }
    }
  }, [config.language, updateState]);

  // Adaptive VAD loop
  const startVadMonitoring = useCallback(() => {
    const silenceTimeout = config.silenceThresholdMs || 800;

    const vadTick = async () => {
      const db = audioService.getEnergyDb();
      setVadEnergyDb(db);
      const currentState = stateRef.current;

      if (db > -95) {
        if (noiseFloorRef.current === null) {
          noiseFloorRef.current = db;
        } else {
          noiseFloorRef.current = noiseFloorRef.current * 0.97 + db * 0.03;
        }
      }

      const ambient = noiseFloorRef.current ?? -50;
      const thresholdDb = Math.min(-34, Math.max(-52, ambient + 7));

      if (currentState === 'tts_speaking' && config.bargeInEnabled && db > thresholdDb + 4) {
        handleBargeIn();
        vadLoopRef.current = requestAnimationFrame(vadTick);
        return;
      }

      if (currentState !== 'listening' && currentState !== 'vad_detecting') {
        vadLoopRef.current = requestAnimationFrame(vadTick);
        return;
      }

      const hasVocalEnergy = db > thresholdDb;
      const hasLiveWords = Boolean(
        currentTranscriptRef.current.trim() || latestInterimRef.current.trim()
      );

      if (hasVocalEnergy) {
        lastVocalTimestampRef.current = Date.now();
        if (!speechStartTimeRef.current) {
          speechStartTimeRef.current = Date.now();
        }
        const energyDuration = Date.now() - speechStartTimeRef.current;
        if (hasLiveWords || energyDuration > 280) {
          hasSpokenRef.current = true;
          setSilenceCountdownPct(0);
          if (stateRef.current !== 'vad_detecting') {
            updateState('vad_detecting');
          }
        }
      } else {
        if (hasSpokenRef.current && (hasLiveWords || (speechStartTimeRef.current && (Date.now() - speechStartTimeRef.current > 350)))) {
          const now = Date.now();
          const elapsedSilence = now - lastVocalTimestampRef.current;
          const effectiveTimeout = latestIsFinalRef.current && hasLiveWords
            ? Math.min(silenceTimeout, 650)
            : silenceTimeout;
          const progress = Math.min(100, (elapsedSilence / effectiveTimeout) * 100);
          setSilenceCountdownPct(progress);

          if (elapsedSilence >= effectiveTimeout) {
            await commitSpeechTurn();
          }
        } else if (!hasLiveWords) {
          speechStartTimeRef.current = null;
          hasSpokenRef.current = false;
          setSilenceCountdownPct(0);
          if (stateRef.current === 'vad_detecting') {
            updateState('listening');
          }
        }
      }

      vadLoopRef.current = requestAnimationFrame(vadTick);
    };

    vadLoopRef.current = requestAnimationFrame(vadTick);
  }, [config.bargeInEnabled, config.silenceThresholdMs, commitSpeechTurn, handleBargeIn, updateState]);

  // Start / stop microphone session
  const handleToggleMic = async () => {
    if (stateRef.current === 'listening' || stateRef.current === 'vad_detecting') {
      if (hasSpokenRef.current || liveTranscript.trim()) {
        await commitSpeechTurn();
      } else {
        isListeningRef.current = false;
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
          recognitionRef.current = null;
        }
        audioService.stopMic();
        if (vadLoopRef.current) {
          cancelAnimationFrame(vadLoopRef.current);
          vadLoopRef.current = null;
        }
        updateState('idle');
        hasSpokenRef.current = false;
        speechStartTimeRef.current = null;
        setSilenceCountdownPct(0);
        setLiveTranscript('');
      }
    } else {
      setMicError(null);
      try {
        await audioService.initMic();
        audioService.startSpeechCapture();
        currentTranscriptRef.current = '';
        latestInterimRef.current = '';
        setLiveTranscript('');
        hasSpokenRef.current = false;
        speechStartTimeRef.current = null;
        lastVocalTimestampRef.current = Date.now();
        isListeningRef.current = true;

        const rec = initSpeechRecognition();
        if (rec) {
          recognitionRef.current = rec;
          try {
            rec.start();
          } catch {}
        }

        updateState('listening');
        startVadMonitoring();
      } catch (err: any) {
        setMicError(err.message || 'Microphone access denied or hardware not found.');
        updateState('idle');
        isListeningRef.current = false;
      }
    }
  };

  // Replay speech audio from previous turn
  const handleReplayAudio = (text: string, lang: Language) => {
    updateState('tts_speaking');
    audioService.playSpeech(
      text,
      lang,
      config.speechRate,
      config.speechPitch,
      () => updateState('tts_speaking'),
      () => updateState(isListeningRef.current ? 'listening' : 'idle')
    );
  };

  // Clear conversation history
  const handleClearHistory = () => {
    voiceAssistantService.abortCurrentTurn();
    audioService.stopPlayback();
    setMessages([]);
    setCurrentStreamingText('');
    setIsStreaming(false);
    updateState('idle');
    isListeningRef.current = false;
  };

  // Keyboard shortcut: spacebar toggles mic when not typing in input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleMic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleMic]);

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
    <div className="min-h-screen bg-[#fafaf9] text-zinc-900 flex flex-col font-sans selection:bg-zinc-200">
      {/* Clean Navbar */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onClearHistory={handleClearHistory}
        hasMessages={messages.length > 0}
      />

      {/* Dismissible Mic Error Banner */}
      {micError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center justify-between">
          <span>{micError}</span>
          <button
            onClick={() => setMicError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Experience: Minimalist Voice Aura + Conversation Stream */}
      <main className="flex-1 max-w-2xl w-full mx-auto flex flex-col overflow-hidden">
        {/* Serene Voice Aura at the top */}
        <VoiceAura
          state={assistantState}
          vadEnergyDb={vadEnergyDb}
          silenceCountdownPct={silenceCountdownPct}
          liveTranscript={liveTranscript}
          isSpeaking={assistantState === 'tts_speaking'}
          onInterrupt={handleBargeIn}
        />

        {/* Conversation Stream */}
        <ConversationStream
          messages={messages}
          currentStreamingText={currentStreamingText}
          isStreaming={isStreaming}
          language={language}
          onReplayAudio={handleReplayAudio}
          onSelectPrompt={(text) => executeTurn(text)}
        />
      </main>

      {/* Bottom Floating Action Bar */}
      <footer className="sticky bottom-0 z-10">
        <VoiceActionBar
          state={assistantState}
          onToggleMic={handleToggleMic}
          onCommitTurn={() => commitSpeechTurn()}
          onBargeIn={handleBargeIn}
          onSubmitText={executeTurn}
          language={language}
        />
      </footer>
    </div>
  );
}
