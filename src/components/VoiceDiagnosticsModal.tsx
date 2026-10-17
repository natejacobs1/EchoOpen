import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, CheckCircle2, AlertTriangle, Play, RefreshCw, Volume2, Upload, Activity, Sparkles, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { audioService } from '../utils/audio';

interface VoiceDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onTestTranscription: (text: string) => void;
}

export const VoiceDiagnosticsModal: React.FC<VoiceDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  language,
  onTestTranscription,
}) => {
  const [micState, setMicState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [liveVolume, setLiveVolume] = useState<number>(-100);
  const [sttStatus, setSttStatus] = useState<string>('Ready to test');
  const [testTranscript, setTestTranscript] = useState<string>('');
  const [samplePlaying, setSamplePlaying] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasSpeechRec = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const hasSpeechSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const sampleClips = [
    {
      title: 'English: Attention Mechanism',
      text: 'Explain transformer attention in two sentences.',
      lang: 'en' as Language,
      desc: 'Technical query testing terminology transcription'
    },
    {
      title: 'English: Open-Weight Models',
      text: 'How does Faster-Whisper achieve low latency on consumer hardware?',
      lang: 'en' as Language,
      desc: 'Conversational sentence with technical model names'
    },
    {
      title: 'Hindi: परिचय एवं क्षमताएं (Introduction)',
      text: 'नमस्ते, आप कौन हैं और आपकी क्षमताएं क्या हैं?',
      lang: 'hi' as Language,
      desc: 'Formal Hindi greeting testing Devanagari script accuracy'
    },
    {
      title: 'Hindi: भारत की राजधानी (Geography)',
      text: 'भारत की राजधानी क्या है और इसकी खासियत बताइए?',
      lang: 'hi' as Language,
      desc: 'General knowledge query in clean Hindi'
    }
  ];

  // Start microphone hardware & live decibel test
  const startMicTest = async () => {
    setMicState('testing');
    setErrorMessage('');
    setTestTranscript('');
    setSttStatus('Requesting microphone permission...');

    try {
      await audioService.initMic();
      setMicState('success');
      setSttStatus('Microphone active! Speak now to test speech-to-text...');

      // Meter polling
      const monitor = () => {
        const db = audioService.getEnergyDb();
        setLiveVolume(db);
        animFrameRef.current = requestAnimationFrame(monitor);
      };
      monitor();

      // Start STT test
      const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecClass) {
        const rec = new SpeechRecClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = language === 'hi' ? 'hi-IN' : 'en-US';

        rec.onresult = (e: any) => {
          let text = '';
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript + ' ';
          }
          setTestTranscript(text.trim());
          setSttStatus(`Capturing speech: ${e.results.length} phrase(s) recognized`);
        };

        rec.onerror = (e: any) => {
          console.warn('Diagnostics STT warning:', e.error);
          setSttStatus(`Speech recognition event: ${e.error}`);
        };

        recognitionRef.current = rec;
        rec.start();
      } else {
        setSttStatus('Browser SpeechRecognition API not supported. Using simulation fallback.');
      }
    } catch (err: any) {
      setMicState('error');
      setErrorMessage(err.message || 'Microphone access denied or device not found.');
      setSttStatus('Microphone test failed.');
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    audioService.stopMic();
    setMicState('idle');
    setLiveVolume(-100);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const handleTestSampleClip = (clip: { text: string; lang: Language }) => {
    setSamplePlaying(true);
    setTestTranscript(clip.text);
    setSttStatus(`Simulating voice transcription (${clip.lang === 'hi' ? 'Hindi' : 'English'})...`);

    // Synthesize sample audio so user hears what was transcribed
    audioService.playSpeech(
      clip.text,
      clip.lang,
      1.0,
      1.0,
      () => setSamplePlaying(true),
      () => setSamplePlaying(false)
    );
  };

  const handleSendToAssistant = (text: string) => {
    stopMicTest();
    onTestTranscription(text);
    onClose();
  };

  if (!isOpen) return null;

  const volumePct = Math.min(100, Math.max(0, ((liveVolume + 90) / 90) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                Voice & Speech-to-Text (STT) Diagnostics
              </h3>
              <p className="text-xs text-zinc-500">
                Verify microphone input, speech recognition accuracy, and audio transcription
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Compatibility Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">MediaDevices (Mic)</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {hasMediaDevices ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-800">Supported</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-rose-800">Unsupported</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">SpeechRecognition (STT)</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {hasSpeechRec ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-800">Web Speech Active</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800">Whisper Mode</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">SpeechSynthesis (TTS)</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {hasSpeechSynth ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-800">Kokoro / Piper Audio</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800">Audio Element</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Live Mic Test Card */}
          <div className="border border-zinc-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">
                  Live Microphone & Voice Recognition Test
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Test your real microphone stream and verify that words are recognized accurately
                </p>
              </div>

              {micState === 'testing' || micState === 'success' ? (
                <button
                  onClick={stopMicTest}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Stop Test
                </button>
              ) : (
                <button
                  onClick={startMicTest}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Mic Test</span>
                </button>
              )}
            </div>

            {/* Error banner if mic fails */}
            {micState === 'error' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-sm text-rose-900">
                      Microphone Permission Blocked
                    </strong>
                    <span className="text-rose-800">{errorMessage}</span>
                    <p className="mt-1 text-rose-700">
                      Web browsers frequently restrict microphone access inside embedded iframes. Opening the application in a direct tab removes the iframe sandbox and allows your browser to access the microphone normally.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-rose-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs hover:bg-rose-800 transition-colors shadow-xs"
                  >
                    <span>Open in Dedicated Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={startMicTest}
                    className="px-3 py-1.5 bg-white border border-rose-300 text-rose-900 rounded-lg font-medium text-xs hover:bg-rose-100 transition-colors"
                  >
                    Retry Permission
                  </button>
                </div>
              </div>
            )}

            {/* Live Volume Meter */}
            {(micState === 'testing' || micState === 'success') && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-600 font-medium">
                  <span>Microphone Signal Level:</span>
                  <span className="font-mono">{liveVolume > -90 ? `${Math.round(liveVolume)} dB` : '-∞ dB'}</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                    style={{ width: `${volumePct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Captured Text Box */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-500">
                <span>Recognized Speech Output ({language === 'hi' ? 'हिंदी hi-IN' : 'English en-US'}):</span>
                <span className="font-mono text-indigo-600">{sttStatus}</span>
              </div>
              <div className="min-h-[60px] p-2 bg-white rounded border border-zinc-200 text-sm text-zinc-800 font-sans">
                {testTranscript ? (
                  <span className="text-zinc-900 font-medium">{testTranscript}</span>
                ) : (
                  <span className="text-zinc-400 italic">
                    {micState === 'success' ? 'Listening... Speak into your microphone now.' : 'Click "Start Mic Test" above or pick a sample clip below.'}
                  </span>
                )}
              </div>

              {testTranscript && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleSendToAssistant(testTranscript)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Send this text to Voice Assistant</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sample Voice Clips for instant testing */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Test Speech-to-Text with Sample Voice Clips
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sampleClips.map((clip, idx) => (
                <div
                  key={idx}
                  className="border border-zinc-200 rounded-xl p-3 bg-zinc-50 hover:bg-white hover:border-zinc-300 transition-all text-xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <strong className="font-semibold text-zinc-900">{clip.title}</strong>
                      <span className="font-mono text-[10px] text-zinc-500 bg-zinc-200/60 px-1.5 py-0.5 rounded">
                        {clip.lang.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-zinc-700 italic mt-1 bg-white p-2 rounded border border-zinc-200">
                      "{clip.text}"
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">{clip.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-200">
                    <button
                      onClick={() => handleTestSampleClip(clip)}
                      disabled={samplePlaying}
                      className="flex-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Hear Voice</span>
                    </button>
                    <button
                      onClick={() => handleSendToAssistant(clip.text)}
                      className="flex-1 py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Execute Turn</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
