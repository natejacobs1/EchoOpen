/**
 * Audio processing utilities:
 * - Real-time microphone audio capture and stream analysis
 * - RMS energy calculation for Voice Activity Detection (VAD)
 * - Continuous audio recording for Faster-Whisper / Gemini transcription
 * - Canvas visualizer waveform & frequency extraction
 * - Neural/Synthesized voice playback with instant cancellation for barge-in
 */

class AudioService {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private ttsKeepAliveTimer: any = null;

  public isRecording = false;

  public async initMic(): Promise<MediaStream> {
    if (this.micStream && this.micStream.active) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return this.micStream;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser context.');
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    this.micStream = stream;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;

    this.mediaSource = this.audioCtx.createMediaStreamSource(stream);
    this.mediaSource.connect(this.analyser);
    this.isRecording = true;

    // Immediately start recording audio so zero syllables are missed
    this.startSpeechCapture();

    return stream;
  }

  public startSpeechCapture(): void {
    if (!this.micStream || !this.micStream.active) {
      return;
    }
    // If already recording, clear previous chunks and keep going
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.recordedChunks = [];
      return;
    }

    try {
      this.recordedChunks = [];
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.micStream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
    } catch (err) {
      console.warn('Speech capture initiation note:', err);
    }
  }

  public stopSpeechCapture(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        if (this.recordedChunks.length > 0) {
          const mime = this.recordedChunks[0]?.type || 'audio/webm';
          const blob = new Blob(this.recordedChunks, { type: mime });
          this.recordedChunks = [];
          resolve(blob);
        } else {
          resolve(null);
        }
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.recordedChunks[0]?.type || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        this.recordedChunks = [];
        resolve(blob);
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  public async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public stopMic(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.isRecording = false;
  }

  public getEnergyDb(): number {
    if (!this.analyser) return -100;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    if (rms < 1e-6) return -100;
    return 20 * Math.log10(rms);
  }

  public getWaveformData(outputArray: Uint8Array): void {
    if (!this.analyser) {
      outputArray.fill(128);
      return;
    }
    this.analyser.getByteTimeDomainData(outputArray as unknown as Uint8Array<ArrayBuffer>);
  }

  public getFrequencyData(outputArray: Uint8Array): void {
    if (!this.analyser) {
      outputArray.fill(0);
      return;
    }
    this.analyser.getByteFrequencyData(outputArray as unknown as Uint8Array<ArrayBuffer>);
  }

  private sentenceQueue: Array<{
    text: string;
    language: 'en' | 'hi';
    rate: number;
    pitch: number;
    onStart?: () => void;
  }> = [];
  private isProcessingQueue = false;
  private queueCompletionResolvers: Array<() => void> = [];

  public isSpeaking(): boolean {
    if (this.isProcessingQueue || this.sentenceQueue.length > 0) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }

  public waitForQueueComplete(): Promise<void> {
    if (!this.isSpeaking() && this.sentenceQueue.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queueCompletionResolvers.push(resolve);
    });
  }

  public stopPlayback(): void {
    if (this.ttsKeepAliveTimer) {
      clearInterval(this.ttsKeepAliveTimer);
      this.ttsKeepAliveTimer = null;
    }

    this.sentenceQueue = [];
    this.isProcessingQueue = false;
    const resolvers = [...this.queueCompletionResolvers];
    this.queueCompletionResolvers = [];
    resolvers.forEach((r) => r());

    // 1. Cancel Web Speech utterance immediately (Barge-in abort)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;

    // 2. Stop audio element if playing custom audio bytes
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
  }

  /**
   * Enqueue a sentence into the streaming speech synthesis queue.
   * If not currently speaking, begins playback immediately for near-zero TTFA.
   */
  public enqueueSentence(
    sentence: string,
    language: 'en' | 'hi',
    rate = 1.15,
    pitch = 1.0,
    onStart?: () => void
  ): void {
    const cleanText = sentence
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanText) return;

    this.sentenceQueue.push({
      text: cleanText,
      language,
      rate,
      pitch,
      onStart,
    });

    if (!this.isProcessingQueue) {
      this.processNextSentenceInQueue();
    }
  }

  private processNextSentenceInQueue(): void {
    if (this.sentenceQueue.length === 0) {
      this.isProcessingQueue = false;
      const resolvers = [...this.queueCompletionResolvers];
      this.queueCompletionResolvers = [];
      resolvers.forEach((r) => r());
      return;
    }

    this.isProcessingQueue = true;
    const item = this.sentenceQueue.shift()!;

    if (!('speechSynthesis' in window)) {
      item.onStart?.();
      setTimeout(() => {
        this.processNextSentenceInQueue();
      }, 700);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(item.text);
    this.currentUtterance = utterance;
    utterance.rate = item.rate || 1.15;
    utterance.pitch = item.pitch || 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (item.language === 'hi') {
      utterance.lang = 'hi-IN';
      const hindiVoice = voices.find(
        (v) => v.lang.includes('hi') || v.lang.includes('Hindi') || v.name.toLowerCase().includes('hindi')
      );
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      utterance.lang = 'en-US';
      const naturalVoice = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')) && v.lang.startsWith('en')
      );
      if (naturalVoice) utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      item.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.processNextSentenceInQueue();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      this.processNextSentenceInQueue();
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  }

  public playSpeech(
    text: string,
    language: 'en' | 'hi',
    rate = 1.15,
    pitch = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
    onBoundary?: (charIndex: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      this.stopPlayback();

      if (!('speechSynthesis' in window)) {
        onStart?.();
        setTimeout(() => {
          onEnd?.();
          resolve();
        }, 1200);
        return;
      }

      // Clean markdown symbols for natural TTS speech
      const cleanText = text
        .replace(/[*_#`~[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;
      utterance.rate = rate || 1.15;
      utterance.pitch = pitch || 1.0;

      let voices = window.speechSynthesis.getVoices();
      if (language === 'hi') {
        utterance.lang = 'hi-IN';
        const hindiVoice = voices.find(
          (v) => v.lang.includes('hi') || v.lang.includes('Hindi') || v.name.toLowerCase().includes('hindi')
        );
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        utterance.lang = 'en-US';
        const naturalVoice = voices.find(
          (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')) && v.lang.startsWith('en')
        );
        if (naturalVoice) utterance.voice = naturalVoice;
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        if (this.ttsKeepAliveTimer) {
          clearInterval(this.ttsKeepAliveTimer);
          this.ttsKeepAliveTimer = null;
        }
        this.currentUtterance = null;
        onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        if (this.ttsKeepAliveTimer) {
          clearInterval(this.ttsKeepAliveTimer);
          this.ttsKeepAliveTimer = null;
        }
        console.warn('TTS playback note:', e);
        this.currentUtterance = null;
        onEnd?.();
        resolve();
      };

      if (onBoundary) {
        utterance.onboundary = (e) => {
          onBoundary(e.charIndex);
        };
      }

      // Resume synthesis queue if paused by browser idle
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Chrome SpeechSynthesis keep-alive for uninterrupted sentences
      this.ttsKeepAliveTimer = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(this.ttsKeepAliveTimer);
          this.ttsKeepAliveTimer = null;
        }
      }, 5000);

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const audioService = new AudioService();
