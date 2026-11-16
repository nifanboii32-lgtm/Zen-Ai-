import { useEffect, useRef, useState } from 'react';
import { AboutModal } from './components/AboutModal';
import { CanvasPanel } from './components/CanvasPanel';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import type {
  Attachment,
  CanvasArtifact,
  ChatMode,
  ChatSession,
  GroundingSource,
  Message,
} from './types/chat';

const STORAGE_KEY = 'zen-ai-chats-v1';
const THEME_KEY = 'zen-ai-theme';

function loadSavedChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistChats(chats: ChatSession[]) {
  try {
    // Strip heavy base64 data from older attachments before persisting to stay well within storage limits
    const compact = chats.slice(0, 25).map((chat) => ({
      ...chat,
      messages: chat.messages.map((m) => ({
        ...m,
        attachments: m.attachments?.map((att) => ({
          ...att,
          data: att.size < 120000 ? att.data : '',
          previewUrl: att.size < 120000 ? att.previewUrl : undefined,
        })),
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function deriveChatTitle(text: string, attachments: Attachment[]): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned) {
    return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned;
  }
  if (attachments.length > 0) {
    return attachments[0].name;
  }
  return 'New Chat';
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });

  const [chats, setChats] = useState<ChatSession[]>(loadSavedChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const saved = loadSavedChats();
    return saved.length > 0 ? saved[0].id : null;
  });

  const [mode, setMode] = useState<ChatMode>('standard');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [canvasArtifact, setCanvasArtifact] = useState<CanvasArtifact | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  useEffect(() => {
    persistChats(chats);
  }, [chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeChat?.messages.length, isStreaming]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleNewChat = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
    setActiveChatId(null);
    setCanvasArtifact(null);
  };

  const handleSelectChat = (chatId: string) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
    setActiveChatId(chatId);
    setCanvasArtifact(null);
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setCanvasArtifact(null);
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setStreamingMessageId(null);
  };

  const sendMessage = async (rawText: string, attachments: Attachment[], overrideMode?: ChatMode) => {
    const activeMode = overrideMode ?? mode;
    if (overrideMode) {
      setMode(overrideMode);
    }

    const userMsg: Message = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: rawText,
      mode: activeMode,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: Date.now(),
    };

    const assistantMsgId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      mode: activeMode,
      createdAt: Date.now(),
    };

    let targetChatId = activeChatId;
    let historyForApi: Message[] = [];

    if (!targetChatId) {
      targetChatId = `chat-${Date.now()}`;
      const newChat: ChatSession = {
        id: targetChatId,
        title: deriveChatTitle(rawText, attachments),
        messages: [userMsg, assistantPlaceholder],
        updatedAt: Date.now(),
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(targetChatId);
      historyForApi = [userMsg];
    } else {
      const existing = chats.find((c) => c.id === targetChatId);
      historyForApi = [...(existing?.messages ?? []), userMsg];
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId
            ? {
                ...c,
                title: c.messages.length === 0 ? deriveChatTitle(rawText, attachments) : c.title,
                messages: [...c.messages, userMsg, assistantPlaceholder],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    }

    const updateAssistantMessage = (updater: (m: Message) => Message) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) => (m.id === assistantMsgId ? updater(m) : m)),
              }
            : c
        )
      );
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setStreamingMessageId(assistantMsgId);

    try {
      if (activeMode === 'imagine') {
        const res = await fetch('/api/imagine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: rawText || 'Create a serene, balanced artistic composition',
            attachments: attachments.map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              data: a.data,
              size: a.size,
            })),
          }),
        });

        const data = (await res.json()) as {
          title?: string;
          description?: string;
          svgCode?: string;
          error?: string;
        };

        if (!res.ok || !data.svgCode) {
          throw new Error(data.error || 'Could not generate artwork.');
        }

        updateAssistantMessage((m) => ({
          ...m,
          content: data.description || '',
          artwork: {
            title: data.title || 'Zen AI Artwork',
            description: data.description || '',
            svgCode: data.svgCode!,
          },
        }));
      } else {
        const payloadMessages = historyForApi
          .filter((m) => !m.error && !m.artwork)
          .map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              data: a.data,
              size: a.size,
            })),
          }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: payloadMessages,
            mode: activeMode,
          }),
        });

        if (!res.ok || !res.body) {
          let errMsg = 'Failed to connect to Zen AI.';
          try {
            const errJson = (await res.json()) as { error?: string };
            if (errJson?.error) errMsg = errJson.error;
          } catch {
            const errText = await res.text();
            if (errText) errMsg = errText;
          }
          throw new Error(errMsg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedAnyText = false;

        const processEvents = (chunkText: string, flushAll = false) => {
          buffer += chunkText;
          const parts = buffer.split('\n\n');
          buffer = flushAll ? '' : (parts.pop() ?? '');

          for (const rawEvent of parts) {
            const lines = rawEvent.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              let parsed: {
                type: string;
                text?: string;
                sources?: GroundingSource[];
                error?: string;
              };
              try {
                parsed = JSON.parse(jsonStr);
              } catch {
                continue;
              }

              if (parsed.type === 'text' && parsed.text) {
                receivedAnyText = true;
                updateAssistantMessage((m) => ({
                  ...m,
                  content: m.content + parsed.text,
                }));
              } else if (parsed.type === 'sources' && parsed.sources) {
                updateAssistantMessage((m) => ({
                  ...m,
                  sources: parsed.sources,
                }));
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error || 'An error occurred.');
              }
            }
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            const remaining = decoder.decode();
            if (remaining || buffer) {
              processEvents(remaining, true);
            }
            break;
          }
          processEvents(decoder.decode(value, { stream: true }), false);
        }

        if (!receivedAnyText) {
          throw new Error('Zen AI returned an empty response. Please try again.');
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updateAssistantMessage((m) =>
          m.content ? m : { ...m, content: '*Response stopped.*' }
        );
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Something went wrong.';
        updateAssistantMessage((m) => ({
          ...m,
          error: errorMessage,
        }));
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      <div className="zen-ambient-mesh" aria-hidden="true" />

      <TopBar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="zen-scroll flex-1 overflow-y-auto flex flex-col">
              <WelcomeScreen
                onSelectStarter={(prompt, starterMode) => {
                  void sendMessage(prompt, [], starterMode);
                }}
              />
            </div>
          ) : (
            <div className="zen-scroll flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
              <div className="mx-auto w-full max-w-[820px] space-y-6">
                {activeChat.messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && msg.id === streamingMessageId}
                    onOpenCanvas={(artifact) => setCanvasArtifact(artifact)}
                  />
                ))}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            </div>
          )}

          <ChatInput
            mode={mode}
            onModeChange={setMode}
            onSend={(text, attachments) => {
              void sendMessage(text, attachments);
            }}
            onStop={handleStopStreaming}
            isStreaming={isStreaming}
          />
        </main>

        {canvasArtifact && (
          <CanvasPanel
            artifact={canvasArtifact}
            onClose={() => setCanvasArtifact(null)}
          />
        )}
      </div>

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
