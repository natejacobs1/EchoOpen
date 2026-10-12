import React from 'react';
import { Volume2, RotateCcw, Download, ShieldAlert, Sparkles, User, Bot, Clock } from 'lucide-react';
import { ChatMessage, Language } from '../types';

interface ConversationPanelProps {
  messages: ChatMessage[];
  currentStreamingText: string;
  isStreaming: boolean;
  onReplayAudio: (text: string, language: Language) => void;
  onClearHistory: () => void;
  language: Language;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  currentStreamingText,
  isStreaming,
  onReplayAudio,
  onClearHistory,
  language,
}) => {
  const exportConversation = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `echoopen_transcript_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs flex flex-col h-[480px]">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Multi-Turn Conversation Context
          </h2>
          <p className="text-xs text-zinc-500">
            {messages.length} turns recorded · Context window preserved
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={exportConversation}
            disabled={messages.length === 0}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-40"
            title="Export transcript as JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearHistory}
            disabled={messages.length === 0}
            className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
            title="Clear conversation history"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <Bot className="w-10 h-10 mb-2 text-zinc-300 stroke-[1.5]" />
            <p className="text-sm font-medium text-zinc-700">No voice turns yet</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Press the microphone button below or click one of the quick prompts to speak in English or Hindi.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1 px-1">
              {msg.role === 'user' ? (
                <>
                  <User className="w-3 h-3 text-zinc-600" />
                  <span className="font-medium text-zinc-700">User (Voice Input)</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-indigo-600" />
                  <span className="font-medium text-indigo-900">EchoOpen (Open-Weight)</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-zinc-900 text-white rounded-br-xs'
                  : 'bg-zinc-100 text-zinc-900 rounded-bl-xs border border-zinc-200'
              }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Interruption indicator */}
              {msg.interrupted && (
                <div className="mt-2 pt-2 border-t border-zinc-200 text-xs text-amber-700 flex items-center gap-1 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Turn cut short by barge-in interruption</span>
                </div>
              )}
            </div>

            {/* Assistant Latency & Audio Replay Bar */}
            {msg.role === 'assistant' && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1 text-[11px] text-zinc-500">
                <button
                  onClick={() => onReplayAudio(msg.content, language)}
                  className="flex items-center gap-1 text-zinc-700 hover:text-indigo-600 transition-colors font-medium hover:underline"
                >
                  <Volume2 className="w-3 h-3 text-indigo-600" />
                  <span>Replay Voice</span>
                </button>

                {msg.metrics && (
                  <>
                    <span>·</span>
                    <span className="text-zinc-600">
                      STT: <strong className="text-zinc-900">{msg.metrics.sttLatencyMs}ms</strong>
                    </span>
                    <span>·</span>
                    <span className="text-zinc-600">
                      TTFT: <strong className="text-zinc-900">{msg.metrics.llmTTFTMs}ms</strong>
                    </span>
                    <span>·</span>
                    <span className="text-zinc-600">
                      TTS: <strong className="text-zinc-900">{msg.metrics.ttsFirstChunkMs}ms</strong>
                    </span>
                    <span>·</span>
                    <span className="text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      Total: {msg.metrics.totalRoundtripMs}ms
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Live Streaming Assistant Message */}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1 px-1">
              <Bot className="w-3 h-3 text-indigo-600" />
              <span className="font-medium text-indigo-900">EchoOpen (Streaming...)</span>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-xs px-4 py-2.5 text-sm bg-zinc-100 text-zinc-900 border border-zinc-200">
              <p className="leading-relaxed">
                {currentStreamingText}
                <span className="inline-block w-2 h-4 ml-1 bg-indigo-600 animate-pulse align-middle" />
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
