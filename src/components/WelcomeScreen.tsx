import { Code2, HelpCircle, Languages, Sparkles } from 'lucide-react';
import type { ChatMode } from '../types/chat';
import { ZenLogo } from './ZenLogo';

interface WelcomeScreenProps {
  onSelectStarter: (prompt: string, mode: ChatMode) => void;
}

const STARTERS: Array<{
  label: string;
  prompt: string;
  mode: ChatMode;
  icon: typeof Code2;
}> = [
  {
    label: 'Write Code',
    prompt: 'Write a clean, well-commented Python function and a matching TypeScript example to debounce user search input.',
    mode: 'standard',
    icon: Code2,
  },
  {
    label: 'Ask Anything',
    prompt: 'Explain how the ocean regulates Earth’s climate in clear, everyday language.',
    mode: 'standard',
    icon: HelpCircle,
  },
  {
    label: 'Translate বাংলা ↔ English',
    prompt: 'Translate between বাংলা and English with natural phrasing:\n"চট্টগ্রামের পাহাড় আর সমুদ্রের বাতাস মনকে শান্ত করে।"',
    mode: 'standard',
    icon: Languages,
  },
  {
    label: 'Create Image',
    prompt: 'A serene twilight over misty Chattogram hills with a calm glowing river and floating lanterns',
    mode: 'imagine',
    icon: Sparkles,
  },
];

export function WelcomeScreen({ onSelectStarter }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
      <div className="glass-surface w-full max-w-[660px] rounded-3xl p-6 sm:p-9 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl glass-subtle">
          <ZenLogo className="h-9 w-9" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white text-balance">
          Hi, I&apos;m Zen AI — How can I help?
        </h1>

        <p className="mt-1.5 font-display text-base sm:text-lg font-medium text-teal-700 dark:text-teal-300/95 text-balance">
          হ্যালো, আমি Zen AI — আজ আপনাকে কীভাবে সাহায্য করতে পারি?
        </p>

        <p className="mt-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300/90 max-w-lg mx-auto">
          Ask naturally in English or বাংলা. Attach images, PDFs, or code, speak with your voice, or create visual art.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {STARTERS.map((starter) => {
            const Icon = starter.icon;
            return (
              <button
                key={starter.label}
                type="button"
                onClick={() => onSelectStarter(starter.prompt, starter.mode)}
                className="glass-subtle inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white/80 hover:border-teal-500/40 dark:text-slate-100 dark:hover:bg-white/12 dark:hover:border-teal-400/40 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                <Icon className="h-4 w-4 text-teal-600 dark:text-teal-300 shrink-0" />
                <span>{starter.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
