import { useMemo, useState } from 'react';
import hljs from 'highlight.js';
import { Check, Code2, Copy, Download, Eye, X } from 'lucide-react';
import type { CanvasArtifact } from '../types/chat';

interface CanvasPanelProps {
  artifact: CanvasArtifact;
  onClose: () => void;
}

export function CanvasPanel({ artifact, onClose }: CanvasPanelProps) {
  const isPreviewable = ['html', 'svg', 'htm'].includes(artifact.language.toLowerCase());
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(isPreviewable ? 'preview' : 'code');
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    try {
      if (artifact.language && hljs.getLanguage(artifact.language)) {
        return hljs.highlight(artifact.code, { language: artifact.language }).value;
      }
      return hljs.highlightAuto(artifact.code).value;
    } catch {
      return artifact.code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [artifact.code, artifact.language]);

  const srcDoc = useMemo(() => {
    if (artifact.language.toLowerCase() === 'svg') {
      return `<!doctype html><html><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;padding:16px;box-sizing:border-box;">${artifact.code}</body></html>`;
    }
    return artifact.code;
  }, [artifact.code, artifact.language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore
    }
  };

  const handleDownload = () => {
    const ext = artifact.language === 'text' ? 'txt' : artifact.language.toLowerCase();
    const blob = new Blob([artifact.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen-canvas.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const panelInner = (
    <div className="glass-elevated flex h-full w-full flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-slate-900/10 px-4 py-3 dark:border-white/12">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold text-slate-900 dark:text-white">
            {artifact.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isPreviewable && (
            <div className="glass-subtle flex items-center rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-teal-500/20 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-teal-500/20 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Code</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy canvas code"
            title="Copy"
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-teal-500" /> : <Copy className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download file"
            title="Download"
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Canvas panel"
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isPreviewable && activeTab === 'preview' ? (
          <iframe
            title={artifact.title}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="zen-scroll h-full overflow-auto p-4">
            <pre className="m-0 text-[13px] leading-relaxed font-mono">
              <code
                className={`hljs language-${artifact.language}`}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop docked right Canvas panel (1280px+) */}
      <aside className="hidden xl:block w-[460px] shrink-0 pr-5 py-3">
        {panelInner}
      </aside>

      {/* Overlay Canvas drawer for Laptops & Mobile (<1280px) */}
      <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
        />
        <aside className="relative z-10 h-full w-full max-w-[540px] p-3">
          {panelInner}
        </aside>
      </div>
    </>
  );
}
