/**
 * Audio processing utilities:
 * - Real-time microphone audio capture and stream analysis
 * - RMS energy calculation for Voice Activity Detection (VAD)
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

  public isRecording = false;

  public async initMic(): Promise<MediaStream> {
    if (this.micStream && this.micStream.active) {
      return this.micStream;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.micStream = stream;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.mediaSource = this.audioCtx.createMediaStreamSource(stream);
    this.mediaSource.connect(this.analyser);
    this.isRecording = true;

    return stream;
  }

  public stopMic(): void {
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

  public stopPlayback(): void {
    // 1. Cancel Web Speech utterance immediately
    if ('speechSynthesis' in window) {
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

  public playSpeech(
    text: string,
    language: 'en' | 'hi',
    rate = 1.0,
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
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voices = window.speechSynthesis.getVoices();
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
        this.currentUtterance = null;
        onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('TTS playback error or interrupted:', e);
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

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const audioService = new AudioService();
