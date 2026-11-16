import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import {
  ArrowUp,
  BrainCircuit,
  ChevronDown,
  FileText,
  Globe,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Square,
  Wand2,
  X,
} from 'lucide-react';
import type { Attachment, ChatMode } from '../types/chat';

interface ChatInputProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
}

const MODES: Array<{
  id: ChatMode;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  { id: 'standard', label: 'Standard', description: 'Fast, calm everyday help', icon: Sparkles },
  { id: 'deep-think', label: 'Deep Think', description: 'Extended step-by-step reasoning', icon: BrainCircuit },
  { id: 'web-search', label: 'Web Search', description: 'Live answers grounded online', icon: Globe },
  { id: 'imagine', label: 'Imagine', description: 'Create custom vector artwork', icon: Wand2 },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({ mode, onModeChange, onSend, onStop, isStreaming }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];
  const ActiveModeIcon = activeMode.icon;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Close mode popover on outside click
  useEffect(() => {
    if (!modeMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modeMenuOpen]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (const file of files.slice(0, 4)) {
      if (file.size > 10 * 1024 * 1024) {
        setVoiceError(`${file.name} exceeds 10 MB limit.`);
        continue;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const base64 = dataUrl.split(',')[1] || '';
      const mimeType = file.type || 'text/plain';

      newAttachments.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mimeType,
        data: base64,
        size: file.size,
        previewUrl: mimeType.startsWith('image/') ? dataUrl : undefined,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = () => {
    if (isStreaming) return;
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
    setVoiceError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleVoice = async () => {
    setVoiceError(null);

    if (voiceState === 'recording' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Microphone is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 400) {
          setVoiceState('idle');
          return;
        }

        setVoiceState('transcribing');
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = String(reader.result);
              resolve(result.split(',')[1] || '');
            };
            reader.onerror = () => reject(new Error('Audio read error'));
            reader.readAsDataURL(blob);
          });

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType }),
          });

          const data = (await response.json()) as { text?: string; error?: string };
          if (!response.ok) {
            throw new Error(data.error || 'Voice transcription failed.');
          }

          if (data.text) {
            setText((prev) => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text!));
            textareaRef.current?.focus();
          }
        } catch (err) {
          setVoiceError(err instanceof Error ? err.message : 'Could not transcribe voice.');
        } finally {
          setVoiceState('idle');
        }
      };

      recorder.start();
      setVoiceState('recording');
    } catch {
      setVoiceState('idle');
      setVoiceError('Microphone permission denied or unavailable.');
    }
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isStreaming;

  return (
    <div className="relative z-20 shrink-0 px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
      <div className="mx-auto w-full max-w-[820px]">
        {voiceError && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/12 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-200 backdrop-blur-md">
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              aria-label="Dismiss error"
              className="p-0.5 hover:opacity-75 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="glass-elevated rounded-[26px] p-2 sm:p-2.5 transition-shadow focus-within:border-teal-500/45 dark:focus-within:border-teal-400/40">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 px-1.5 pt-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="glass-subtle group relative flex items-center gap-2 rounded-xl p-1.5 pr-2 text-xs text-slate-700 dark:text-slate-200"
                >
                  {att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-300 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 max-w-[130px]">
                    <div className="truncate font-medium">{att.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatBytes(att.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    aria-label={`Remove ${att.name}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-900/10 hover:text-slate-900 dark:hover:bg-white/15 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1.5 sm:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.html,.css"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image, PDF, or text file"
              title="Attach image, PDF, or text file"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400"
            >
              <Plus className="h-5 w-5" />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'imagine'
                  ? 'Describe an illustration to create...'
                  : 'Ask Zen AI anything in English or বাংলা...'
              }
              className="zen-scroll max-h-[160px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-white dark:placeholder:text-slate-400"
            />

            {/* Mode Selector Dropdown */}
            <div ref={modeMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setModeMenuOpen((v) => !v)}
                aria-expanded={modeMenuOpen}
                aria-label="Select AI mode"
                className="glass-subtle flex min-h-[40px] sm:min-h-[38px] items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                <ActiveModeIcon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-300 shrink-0" />
                <span className="hidden sm:inline">{activeMode.label}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-65 shrink-0" />
              </button>

              {modeMenuOpen && (
                <div className="glass-elevated absolute bottom-full right-0 mb-2 w-60 rounded-2xl p-1.5 z-40">
                  {MODES.map((m) => {
                    const Icon = m.icon;
                    const selected = m.id === mode;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onModeChange(m.id);
                          setModeMenuOpen(false);
                        }}
                        className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-teal-500/15 text-teal-800 dark:text-teal-200'
                            : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/8'
                        }`}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{m.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {m.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bilingual Voice Input Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={voiceState === 'transcribing'}
              aria-label={voiceState === 'recording' ? 'Stop voice recording' : 'Voice input (English or Bangla)'}
              title={voiceState === 'recording' ? 'Tap to transcribe' : 'Speak in English or বাংলা'}
              className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400 ${
                voiceState === 'recording'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {voiceState === 'transcribing' ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin text-teal-500" />
              ) : (
                <Mic className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                title="Stop response"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                aria-label="Send message"
                className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-2 focus-visible:outline-teal-400 ${
                  canSend
                    ? 'bg-gradient-to-tr from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/30 hover:brightness-110 active:scale-95 cursor-pointer'
                    : 'bg-slate-900/8 text-slate-400 dark:bg-white/8 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
