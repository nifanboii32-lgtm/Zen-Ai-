import { Briefcase, Globe, MapPin, Sparkles, User, X } from 'lucide-react';
import { ZenLogo } from './ZenLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-zen-title"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm"
      />

      <div className="glass-elevated relative z-10 w-full max-w-[490px] rounded-3xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="glass-subtle flex h-11 w-11 items-center justify-center rounded-2xl">
              <ZenLogo className="h-7 w-7" />
            </div>
            <div>
              <h2
                id="about-zen-title"
                className="font-display text-xl font-semibold text-slate-900 dark:text-white"
              >
                About Creator · Zen AI
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bilingual Frosted-Glass Assistant (English &amp; বাংলা)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close About dialog"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3.5 text-sm text-slate-700 dark:text-slate-200">
          <div className="glass-subtle rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 mt-0.5 text-teal-600 dark:text-teal-300 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">App Name: </span>
                <span className="font-semibold text-slate-900 dark:text-white">Zen AI</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 mt-0.5 text-teal-600 dark:text-teal-300 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Creator: </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Raki~B (Md Rakibul Hasan)
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 mt-0.5 text-teal-600 dark:text-teal-300 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Location: </span>
                <span>Chattogram, Bangladesh (চট্টগ্রাম, বাংলাদেশ)</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Briefcase className="h-4 w-4 mt-0.5 text-teal-600 dark:text-teal-300 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Role: </span>
                <span>Software &amp; AI Developer, Game &amp; Web App Creator</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Globe className="h-4 w-4 mt-0.5 text-teal-600 dark:text-teal-300 shrink-0" />
              <span>Fluent in English &amp; বাংলা · Standard · Deep Think · Web Search · Imagine</span>
            </div>
          </div>

          <div className="glass-subtle rounded-2xl p-4 space-y-1.5">
            <p className="text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-100">
              Zen AI হলো একটি আধুনিক, মাল্টিমোডাল এবং বহুভাষিক AI অ্যাসিস্ট্যান্ট, যা কোডিং, পড়াশোনা এবং দৈনন্দিন কাজকে সহজ করার জন্য তৈরি করা হয়েছে।
            </p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              A modern, multimodal, and multilingual AI assistant built to simplify coding, learning, and everyday productivity.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors cursor-pointer"
          >
            Done · বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
