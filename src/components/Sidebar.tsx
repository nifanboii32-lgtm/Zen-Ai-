import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import type { ChatSession } from '../types/chat';

interface SidebarProps {
  isOpen: boolean;
  chats: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Sidebar({
  isOpen,
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose,
}: SidebarProps) {
  const drawerContent = (
    <div className="glass-elevated flex h-full w-[272px] flex-col rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2 pb-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            if (window.innerWidth < 1280) onClose();
          }}
          className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-teal-600/20 hover:bg-teal-500 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">New Chat</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="flex xl:hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-2 pb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Recent Chats
      </div>

      <div className="zen-scroll flex-1 overflow-y-auto space-y-1 pr-0.5">
        {chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Your conversations will appear here.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                className={`group relative flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
                  isActive
                    ? 'bg-slate-900/10 text-slate-900 dark:bg-white/12 dark:text-white'
                    : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/6'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectChat(chat.id);
                    if (window.innerWidth < 1280) onClose();
                  }}
                  className="flex flex-1 min-w-0 min-h-[36px] items-center gap-2.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400 rounded-lg"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-65" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium leading-tight">
                      {chat.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatRelativeTime(chat.updatedAt)}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  aria-label={`Delete ${chat.title}`}
                  className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg text-slate-400 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop docked sidebar (1280px+) */}
      {isOpen && (
        <aside className="hidden xl:block shrink-0 pl-5 py-3">
          {drawerContent}
        </aside>
      )}

      {/* Mobile & Laptop slide-over drawer (<1280px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex xl:hidden">
          <div
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity"
          />
          <aside className="relative z-10 h-full p-3">
            {drawerContent}
          </aside>
        </div>
      )}
    </>
  );
}
