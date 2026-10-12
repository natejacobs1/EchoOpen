export type Language = 'en' | 'hi';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  hindiContent?: string;
  timestamp: number;
  audioDuration?: number;
  metrics?: LatencyMetrics;
  interrupted?: boolean;
}

export interface LatencyMetrics {
  sttLatencyMs: number;        // Faster-Whisper transcription time
  llmTTFTMs: number;           // Time to First Token
  llmTotalMs: number;          // Full LLM completion time
  ttsFirstChunkMs: number;     // Kokoro/Piper first audio packet generated
  totalRoundtripMs: number;    // User silence -> First audio playback started
  tokensGenerated: number;
  tokensPerSec: number;
}

export type AssistantState = 
  | 'idle' 
  | 'listening' 
  | 'vad_detecting' 
  | 'stt_processing' 
  | 'llm_thinking' 
  | 'tts_speaking';

export interface PipelineConfig {
  language: Language;
  sttModel: 'faster-whisper-tiny' | 'faster-whisper-base' | 'faster-whisper-small' | 'whisper-large-v3-turbo';
  llmModel: 'qwen2.5-3b-instruct' | 'llama-3.2-3b-instruct' | 'gemma-2-2b-it' | 'qwen2.5-7b-instruct';
  ttsModel: 'kokoro-82m' | 'piper-en-lessac' | 'piper-hi-pratham';
  ttsVoice: string;
  vadSensitivity: number; // 0.01 to 0.1
  silenceThresholdMs: number; // 600 - 1500ms
  bargeInEnabled: boolean;
  streamingTtsEnabled: boolean;
  systemPrompt: string;
  localOllamaUrl: string;
  localBackendUrl: string;
  useLocalBackend: boolean;
  speechRate: number;
  speechPitch: number;
}

export interface RepoFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export interface HardwareBenchmark {
  hardware: string;
  vram: string;
  sttLatency: string;
  llmTTFT: string;
  ttsLatency: string;
  totalRoundtrip: string;
  suitability: 'Ideal' | 'Recommended' | 'Baseline' | 'Constrained';
}
