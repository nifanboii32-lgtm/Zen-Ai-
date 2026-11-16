import { Info, Menu, Moon, Sun } from 'lucide-react';
import { ZenLogo } from './ZenLogo';

interface TopBarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenAbout: () => void;
}

export function TopBar({ theme, onToggleTheme, onToggleSidebar, onOpenAbout }: TopBarProps) {
  return (
    <header className="relative z-30 shrink-0 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass-surface mx-auto flex h-13 sm:h-14 max-w-[1440px] items-center justify-between gap-4 rounded-2xl px-3 sm:px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle recent chats sidebar"
            className="flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <ZenLogo className="h-7 w-7 shrink-0" />
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              Zen AI
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-slate-900/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-200 whitespace-nowrap shrink-0">
              by Raki~B
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>

          <button
            type="button"
            onClick={onOpenAbout}
            aria-label="About Zen AI"
            title="About Zen AI"
            className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400"
          >
            <Info className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
