import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  PanelRightOpen,
  Square,
  Volume2,
} from 'lucide-react';
import type { CanvasArtifact, Message } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ZenLogo } from './ZenLogo';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onOpenCanvas: (artifact: CanvasArtifact) => void;
}

export function ChatMessage({ message, isStreaming = false, onOpenCanvas }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleCopyMessage = async () => {
    const textToCopy = message.artwork
      ? `${message.artwork.title}\n${message.artwork.description}`
      : message.content;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleToggleSpeech = async () => {
    if (ttsState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setTtsState('idle');
      return;
    }

    const textToSpeak = message.artwork
      ? `${message.artwork.title}. ${message.artwork.description}`
      : message.content;

    if (!textToSpeak.trim()) return;

    setTtsError(null);
    setTtsState('loading');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      });

      const data = (await response.json()) as {
        audioBase64?: string;
        mimeType?: string;
        error?: string;
      };

      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'Unable to generate audio.');
      }

      const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setTtsState('idle');
      audio.onerror = () => {
        setTtsState('idle');
        setTtsError('Audio playback failed.');
      };

      await audio.play();
      setTtsState('playing');
    } catch (err) {
      setTtsState('idle');
      setTtsError(err instanceof Error ? err.message : 'Speech playback failed.');
    }
  };

  const handleDownloadSvg = () => {
    if (!message.artwork) return;
    const blob = new Blob([message.artwork.svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${message.artwork.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'zen-artwork'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="glass-surface max-w-[88%] sm:max-w-[78%] rounded-2xl rounded-tr-md px-4 py-3 text-slate-900 dark:text-white">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {message.attachments.map((att) =>
                att.mimeType.startsWith('image/') && att.previewUrl ? (
                  <img
                    key={att.id}
                    src={att.previewUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-xl object-cover border border-white/15"
                  />
                ) : (
                  <div
                    key={att.id}
                    className="glass-subtle inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-300 shrink-0" />
                    <span className="max-w-[160px] truncate">{att.name}</span>
                  </div>
                )
              )}
            </div>
          )}

          {message.content && (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>
          )}
        </div>
      </div>
    );
  }

  const svgDataUrl = message.artwork
    ? `data:image/svg+xml;utf8,${encodeURIComponent(message.artwork.svgCode)}`
    : null;

  return (
    <div className="flex items-start gap-3 sm:gap-3.5">
      <div className="glass-subtle mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        <ZenLogo className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        {message.artwork && svgDataUrl ? (
          <div className="glass-surface overflow-hidden rounded-2xl p-3 sm:p-4 max-w-[560px]">
            <div className="relative overflow-hidden rounded-xl border border-slate-900/10 dark:border-white/10 bg-slate-950/20">
              {!artworkLoadFailed ? (
                <img
                  src={svgDataUrl}
                  alt={message.artwork.title}
                  referrerPolicy="no-referrer"
                  onError={() => setArtworkLoadFailed(true)}
                  className="w-full h-auto block"
                />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal-900/40 to-indigo-900/40 p-4 text-center text-sm text-slate-200">
                  <span>{message.artwork.title}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {message.artwork.title}
                </h4>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                  {message.artwork.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onOpenCanvas({
                      title: message.artwork!.title,
                      language: 'svg',
                      code: message.artwork!.svgCode,
                    })
                  }
                  className="glass-subtle inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  <span>Canvas</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="glass-subtle inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>SVG</span>
                </button>
              </div>
            </div>
          </div>
        ) : message.content ? (
          <MarkdownRenderer content={message.content} onOpenCanvas={onOpenCanvas} />
        ) : isStreaming && !message.error ? (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
            <span>
              {message.mode === 'deep-think'
                ? 'Thinking deeply...'
                : message.mode === 'web-search'
                  ? 'Searching the web...'
                  : message.mode === 'imagine'
                    ? 'Crafting artwork...'
                    : 'Zen AI is composing...'}
            </span>
          </div>
        ) : null}

        {message.error && (
          <div className="glass-subtle flex items-start gap-2.5 rounded-2xl border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{message.error}</span>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="pt-1">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Globe className="h-3.5 w-3.5" />
              <span>Web Sources</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-subtle inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs text-slate-700 hover:border-teal-500/40 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300 transition-colors max-w-[240px]"
                >
                  <span className="truncate">{src.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!isStreaming && !message.error && (message.content || message.artwork) && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <button
              type="button"
              onClick={handleCopyMessage}
              aria-label="Copy response"
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-900/6 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-teal-700 dark:text-teal-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleSpeech}
              disabled={ttsState === 'loading'}
              aria-label={ttsState === 'playing' ? 'Stop listening' : 'Listen to reply'}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-900/6 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              {ttsState === 'loading' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparing audio...</span>
                </>
              ) : ttsState === 'playing' ? (
                <>
                  <Square className="h-3 w-3 fill-current text-teal-600 dark:text-teal-300" />
                  <span className="text-teal-700 dark:text-teal-300">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Listen</span>
                </>
              )}
            </button>

            {ttsError && (
              <span className="text-xs text-rose-600 dark:text-rose-400 ml-1">{ttsError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
