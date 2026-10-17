import React, { useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { ChatMessage, Language } from '../types';

interface ConversationStreamProps {
  messages: ChatMessage[];
  currentStreamingText: string;
  isStreaming: boolean;
  language: Language;
  onReplayAudio: (text: string, language: Language) => void;
  onSelectPrompt: (text: string) => void;
}

export const ConversationStream: React.FC<ConversationStreamProps> = ({
  messages,
  currentStreamingText,
  isStreaming,
  language,
  onReplayAudio,
  onSelectPrompt,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingText]);

  const starterPrompts =
    language === 'hi'
      ? [
          'नमस्ते, आप मेरी क्या मदद कर सकते हैं?',
          'मन को शांत रखने के 3 आसान उपाय बताइए।',
          'सफलता के लिए सबसे ज़रूरी आदत क्या है?',
        ]
      : [
          'What are 3 small habits that bring clarity and calm?',
          'Tell me a fascinating fact about nature or space.',
          'Give me a creative idea for a relaxing weekend.',
        ];

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scroll-smooth"
    >
      {/* Empty State / Gentle Welcome */}
      {messages.length === 0 && !isStreaming && (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto py-12">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-700 shadow-xs">
            <svg
              className="w-6 h-6 stroke-[1.75]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
            {language === 'hi' ? 'नमस्ते, मैं आवाज़ में बात करता हूँ' : 'Speak naturally, I am listening'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            {language === 'hi'
              ? 'नीचे दिए गए माइक बटन को दबाकर कुछ भी पूछें, या दिए गए सुझाव पर क्लिक करें।'
              : 'Tap the mic below to ask a question, tell a thought, or choose a prompt to begin.'}
          </p>

          {/* Minimalist Starter Suggestions */}
          <div className="flex flex-col w-full gap-2 mt-6">
            {starterPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt(prompt)}
                className="text-left px-3.5 py-2.5 rounded-xl border border-zinc-200/90 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-xs text-zinc-700 transition-colors shadow-2xs"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Stream */}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col ${
            msg.role === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-zinc-900 text-white rounded-br-xs shadow-xs'
                : 'bg-zinc-100 text-zinc-900 rounded-bl-xs border border-zinc-200/60'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>

          {/* Subtle audio replay button for assistant answers */}
          {msg.role === 'assistant' && (
            <div className="mt-1 flex items-center gap-1.5 px-1">
              <button
                onClick={() => onReplayAudio(msg.content, language)}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors py-0.5"
                title="Listen to this message"
              >
                <Volume2 className="w-3 h-3" />
                <span>Listen</span>
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Streaming Response Bubble */}
      {isStreaming && (
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-xs px-4 py-3 text-sm leading-relaxed bg-zinc-100 text-zinc-900 border border-zinc-200/60">
            <p className="whitespace-pre-wrap">
              {currentStreamingText}
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-zinc-600 animate-pulse align-middle" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
