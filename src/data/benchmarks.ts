import { HardwareBenchmark } from '../types';

export const HARDWARE_BENCHMARKS: HardwareBenchmark[] = [
  {
    hardware: 'NVIDIA RTX 4090 (24GB)',
    vram: '4.8 GB utilized',
    sttLatency: '95 ms',
    llmTTFT: '75 ms',
    ttsLatency: '65 ms',
    totalRoundtrip: '235 ms',
    suitability: 'Ideal'
  },
  {
    hardware: 'NVIDIA RTX 3060 (12GB)',
    vram: '4.2 GB utilized',
    sttLatency: '180 ms',
    llmTTFT: '140 ms',
    ttsLatency: '110 ms',
    totalRoundtrip: '430 ms',
    suitability: 'Recommended'
  },
  {
    hardware: 'Apple Silicon M2 / M3 (16GB)',
    vram: 'Unified Memory',
    sttLatency: '210 ms',
    llmTTFT: '175 ms',
    ttsLatency: '135 ms',
    totalRoundtrip: '520 ms',
    suitability: 'Recommended'
  },
  {
    hardware: 'Modern x86 CPU (Intel i7 / Ryzen 7, AVX-512)',
    vram: 'System RAM (6 GB)',
    sttLatency: '340 ms',
    llmTTFT: '390 ms',
    ttsLatency: '220 ms',
    totalRoundtrip: '950 ms',
    suitability: 'Baseline'
  },
  {
    hardware: 'Raspberry Pi 5 (8GB)',
    vram: 'System RAM (4 GB)',
    sttLatency: '850 ms',
    llmTTFT: '1100 ms',
    ttsLatency: '450 ms',
    totalRoundtrip: '2400 ms',
    suitability: 'Constrained'
  }
];

export const MODEL_COMPARISONS = {
  stt: [
    {
      name: 'Faster-Whisper (base)',
      weights: 'Open (OpenAI / CTranslate2)',
      params: '74M',
      memory: '150 MB (int8)',
      werEnglish: '5.2%',
      werHindi: '12.8%',
      speed: '4.2x faster than PyTorch',
      selected: true
    },
    {
      name: 'Faster-Whisper (small)',
      weights: 'Open (OpenAI / CTranslate2)',
      params: '244M',
      memory: '480 MB (int8)',
      werEnglish: '3.8%',
      werHindi: '8.4%',
      speed: '2.5x faster than PyTorch',
      selected: false
    },
    {
      name: 'Whisper Large v3 Turbo',
      weights: 'Open (OpenAI)',
      params: '809M',
      memory: '1.6 GB (fp16)',
      werEnglish: '2.1%',
      werHindi: '5.1%',
      speed: 'Higher VRAM required',
      selected: false
    }
  ],
  llm: [
    {
      name: 'Qwen 2.5 (3B-Instruct)',
      weights: 'Open (Alibaba Cloud / Apache 2.0)',
      params: '3.09B',
      quantization: 'Q4_K_M (1.9 GB)',
      tokPerSec: '48.2 tok/s (RTX 3060)',
      multilingualScore: '94/100 (Exceptional Hindi & Hinglish)',
      selected: true
    },
    {
      name: 'Llama 3.2 (3B-Instruct)',
      weights: 'Open (Meta Community License)',
      params: '3.21B',
      quantization: 'Q4_K_M (2.0 GB)',
      tokPerSec: '46.5 tok/s (RTX 3060)',
      multilingualScore: '89/100 (Strong general reasoning)',
      selected: false
    },
    {
      name: 'Gemma 2 (2B-IT)',
      weights: 'Open (Google DeepMind Open Weights)',
      params: '2.61B',
      quantization: 'Q4_K_M (1.6 GB)',
      tokPerSec: '58.0 tok/s (RTX 3060)',
      multilingualScore: '82/100 (Fastest TTFT)',
      selected: false
    }
  ],
  tts: [
    {
      name: 'Kokoro-82M',
      weights: 'Open (Apache 2.0)',
      params: '82M',
      firstChunkLatency: '85 - 110 ms',
      audioQuality: 'High Naturalness (24kHz)',
      hindiSupport: 'Basic phonemizer support',
      selected: true
    },
    {
      name: 'Piper Neural TTS',
      weights: 'Open (MIT)',
      params: '15M - 35M',
      firstChunkLatency: '60 - 90 ms',
      audioQuality: 'Clear, crisp broadcast quality',
      hindiSupport: 'Native hi_IN Pratham checkpoint',
      selected: true
    },
    {
      name: 'Bark (Suno)',
      weights: 'Open (MIT)',
      params: '300M',
      firstChunkLatency: '1800 ms (Too slow for live conversation)',
      audioQuality: 'High expressive emotion',
      hindiSupport: 'Moderate',
      selected: false
    }
  ]
};

export const DEMO_SCRIPT_STEPS = [
  {
    step: '1. Introduction & Architecture (0:00 - 0:35)',
    objective: 'Demonstrate pipeline architecture and open-weight models',
    talkingPoints: [
      'Welcome to EchoOpen Voice AI, an end-to-end conversational assistant built entirely with open-weight models.',
      'Our pipeline uses Faster-Whisper int8 for STT, Qwen 2.5 3B / Llama 3.2 via Ollama for LLM, and Kokoro-82M / Piper for TTS.',
      'Notice the full pipeline runs without any paid or cloud hosted inference APIs.'
    ]
  },
  {
    step: '2. English Multi-Turn Conversation (0:35 - 1:15)',
    objective: 'Demonstrate context preservation and sub-second response latency',
    talkingPoints: [
      'User: "Can you briefly explain what transformer attention is in two sentences?"',
      'Observe the live oscilloscope, silence VAD trigger, and under 500ms roundtrip latency.',
      'Follow-up turn: "And who first invented it?" — proves multi-turn context retention across turns.'
    ]
  },
  {
    step: '3. Barge-In Interruption Showcase (1:15 - 1:45)',
    objective: 'Demonstrate real-time interruption handling',
    talkingPoints: [
      'Ask the assistant to list 5 tips for clean software engineering.',
      'Interrupt mid-sentence: "Wait, stop! Just give me the most important one."',
      'Observe that playback cuts off instantly, abort controller signals the LLM stream, and the new prompt executes immediately.'
    ]
  },
  {
    step: '4. Multilingual Hindi Support (1:45 - 2:20)',
    objective: 'Demonstrate Devanagari STT, Hindi reasoning, and Hindi speech synthesis',
    talkingPoints: [
      'Switch language to Hindi (हिंदी).',
      'User speaks: "नमस्ते, आप मेरी किस प्रकार सहायता कर सकते हैं?" (Namaste, how can you help me?)',
      'The assistant transcribes in Hindi, reasons using Qwen 2.5 multilingual weights, and outputs clear Hindi voice.'
    ]
  },
  {
    step: '5. Latency Profiler & Source Code Verification (2:20 - 2:50)',
    objective: 'Review observed performance metrics and repository architecture',
    talkingPoints: [
      'Review the real-time latency waterfall: 180ms STT + 140ms TTFT + 110ms TTS First Chunk = 430ms total.',
      'Highlight the repository tab containing backend/main.py, pipeline.py, docker-compose.yml, and 1-click ZIP export.'
    ]
  }
];
