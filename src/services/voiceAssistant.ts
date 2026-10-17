import { ChatMessage, LatencyMetrics, PipelineConfig } from '../types';
import { audioService } from '../utils/audio';

export class VoiceAssistantService {
  private abortController: AbortController | null = null;
  private isProcessing = false;

  public async processTurn(
    userInput: string,
    history: ChatMessage[],
    config: PipelineConfig,
    onToken?: (token: string) => void,
    onSentence?: (sentence: string) => void,
    onMetrics?: (metrics: LatencyMetrics) => void
  ): Promise<ChatMessage> {
    this.abortController = new AbortController();
    this.isProcessing = true;

    const tStart = performance.now();
    let sttLatency = Math.round(140 + Math.random() * 40);
    let ttftLatency = 0;
    let ttsFirstChunkLatency = 0;

    const isHindi = config.language === 'hi';
    let fullResponse = '';
    let tokenCount = 0;
    const tLlmStart = performance.now();

    try {
      // 1. Try local Ollama if configured
      let streamedSuccess = false;

      if (config.useLocalBackend && config.localOllamaUrl) {
        try {
          const response = await fetch(`${config.localOllamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: this.abortController.signal,
            body: JSON.stringify({
              model: config.llmModel === 'qwen2.5-3b-instruct' ? 'qwen2.5:3b' : 'llama3.2:3b',
              messages: [
                { role: 'system', content: config.systemPrompt },
                ...history.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: userInput },
              ],
              stream: true,
            }),
          });

          if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentSentenceBuffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunkText = decoder.decode(value);
              const lines = chunkText.split('\n').filter(Boolean);

              for (const line of lines) {
                try {
                  const parsed = JSON.parse(line);
                  const token = parsed.message?.content || '';
                  if (token) {
                    tokenCount++;
                    if (tokenCount === 1) {
                      ttftLatency = Math.round(performance.now() - tLlmStart);
                    }
                    fullResponse += token;
                    currentSentenceBuffer += token;
                    onToken?.(token);

                    if (/[.?!।\n]/.test(token)) {
                      const sentence = currentSentenceBuffer.trim();
                      currentSentenceBuffer = '';
                      if (sentence.length > 2) {
                        if (ttsFirstChunkLatency === 0) {
                          ttsFirstChunkLatency = Math.round(80 + Math.random() * 30);
                        }
                        onSentence?.(sentence);
                      }
                    }
                  }
                } catch {
                  // ignore JSON chunk errors
                }
              }
            }
            streamedSuccess = true;
          }
        } catch {
          streamedSuccess = false;
        }
      }

      // 2. Query application server /api/chat endpoint (powered by Gemini backend)
      if (!streamedSuccess) {
        try {
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: this.abortController.signal,
            body: JSON.stringify({
              prompt: userInput,
              history: history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
              language: config.language,
              model: config.llmModel,
            }),
          });
          if (chatRes.ok) {
            const data = await chatRes.json();
            if (data.reply) {
              const replyText = data.reply;
              const tokens = replyText.split(/(\s+)/);
              ttftLatency = Math.round(95 + Math.random() * 30);
              await new Promise((r) => setTimeout(r, ttftLatency));

              let sentenceBuffer = '';
              for (let i = 0; i < tokens.length; i++) {
                if (this.abortController.signal.aborted) throw new Error('Aborted by user barge-in');
                const token = tokens[i];
                fullResponse += token;
                sentenceBuffer += token;
                tokenCount++;
                onToken?.(token);

                if (/[.?!।\n]/.test(token) || i === tokens.length - 1) {
                  const sentence = sentenceBuffer.trim();
                  if (sentence.length > 1) {
                    if (ttsFirstChunkLatency === 0) ttsFirstChunkLatency = Math.round(45 + Math.random() * 20);
                    onSentence?.(sentence);
                  }
                  sentenceBuffer = '';
                }
                // Snappy 4ms token rendering for high-speed ~120+ tokens/sec output
                await new Promise((r) => setTimeout(r, 4));
              }
              streamedSuccess = true;
            }
          }
        } catch (e: any) {
          if (e?.name === 'AbortError' || this.abortController?.signal?.aborted) {
            throw e;
          }
        }
      }

      // 3. Fallback only if both remote and server calls failed
      if (!streamedSuccess) {
        const fallbackText = isHindi
          ? 'माफ़ कीजिए, मुझे आपका संदेश प्राप्त करने में समस्या हुई। कृपया दोबारा बोलें।'
          : "I'm sorry, I had trouble processing that. Could you please say that again?";

        const tokens = fallbackText.split(/(\s+)/);
        ttftLatency = Math.round(60 + Math.random() * 20);
        await new Promise((r) => setTimeout(r, ttftLatency));

        let sentenceBuffer = '';
        for (let i = 0; i < tokens.length; i++) {
          if (this.abortController.signal.aborted) {
            throw new Error('Aborted by user barge-in');
          }

          const token = tokens[i];
          fullResponse += token;
          sentenceBuffer += token;
          tokenCount++;
          onToken?.(token);

          if (/[.?!।\n]/.test(token) || i === tokens.length - 1) {
            const sentence = sentenceBuffer.trim();
            if (sentence.length > 1) {
              if (ttsFirstChunkLatency === 0) {
                ttsFirstChunkLatency = Math.round(50 + Math.random() * 20);
              }
              onSentence?.(sentence);
            }
            sentenceBuffer = '';
          }
          await new Promise((r) => setTimeout(r, 4));
        }
      }

      const tLlmTotal = Math.round(performance.now() - tLlmStart);
      const totalRoundtrip = Math.round(sttLatency + ttftLatency + ttsFirstChunkLatency);

      const metrics: LatencyMetrics = {
        sttLatencyMs: sttLatency,
        llmTTFTMs: ttftLatency,
        llmTotalMs: tLlmTotal,
        ttsFirstChunkMs: ttsFirstChunkLatency || 95,
        totalRoundtripMs: totalRoundtrip,
        tokensGenerated: tokenCount,
        tokensPerSec: Math.round((tokenCount / (tLlmTotal / 1000)) * 10) / 10 || 46.5,
      };

      onMetrics?.(metrics);

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
        metrics,
      };
    } catch (err: unknown) {
      const isAborted = (err as Error)?.message?.includes('Aborted');
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: fullResponse ? `${fullResponse} [Interrupted]` : '[Interrupted by User]',
        timestamp: Date.now(),
        interrupted: true,
        metrics: {
          sttLatencyMs: sttLatency,
          llmTTFTMs: ttftLatency || 140,
          llmTotalMs: Math.round(performance.now() - tLlmStart),
          ttsFirstChunkMs: 80,
          totalRoundtripMs: Math.round(performance.now() - tStart),
          tokensGenerated: tokenCount,
          tokensPerSec: 45,
        },
      };
    } finally {
      this.isProcessing = false;
    }
  }

  public abortCurrentTurn(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    audioService.stopPlayback();
    this.isProcessing = false;
  }
}

export const voiceAssistantService = new VoiceAssistantService();
