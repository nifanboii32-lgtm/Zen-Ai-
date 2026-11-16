import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import { Check, Copy, PanelRightOpen } from 'lucide-react';
import type { CanvasArtifact } from '../types/chat';

interface MarkdownRendererProps {
  content: string;
  onOpenCanvas?: (artifact: CanvasArtifact) => void;
}

interface CodeBlockProps {
  language: string;
  code: string;
  onOpenCanvas?: (artifact: CanvasArtifact) => void;
}

function CodeBlock({ language, code, onOpenCanvas }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const canOpenCanvas =
    Boolean(onOpenCanvas) &&
    (code.split('\n').length >= 3 || ['html', 'svg', 'xml', 'jsx', 'tsx'].includes(language.toLowerCase()));

  return (
    <div className="my-3.5 overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950/[0.04] dark:border-white/12 dark:bg-slate-950/65">
      <div className="flex items-center justify-between gap-2 border-b border-slate-900/8 px-3.5 py-2 dark:border-white/10">
        <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 lowercase">
          {language || 'code'}
        </span>

        <div className="flex items-center gap-1.5">
          {canOpenCanvas && onOpenCanvas && (
            <button
              type="button"
              onClick={() =>
                onOpenCanvas({
                  title: `${language ? language.toUpperCase() : 'Code'} Snippet`,
                  language: language || 'text',
                  code,
                })
              }
              className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              <span>Canvas</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-900/8 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
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
        </div>
      </div>

      <div className="zen-scroll overflow-x-auto p-3.5">
        <pre className="m-0 text-[13px] leading-relaxed font-mono">
          <code
            className={`hljs ${language ? `language-${language}` : ''}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content, onOpenCanvas }: MarkdownRendererProps) {
  return (
    <div className="zen-prose text-slate-800 dark:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-([\w-]+)/.exec(className || '');
            const text = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match) || text.includes('\n');

            if (isBlock) {
              return (
                <CodeBlock
                  language={match?.[1] || 'text'}
                  code={text}
                  onOpenCanvas={onOpenCanvas}
                />
              );
            }

            return (
              <code
                className="rounded-md bg-slate-900/8 px-1.5 py-0.5 font-mono text-[0.875em] text-slate-900 dark:bg-white/12 dark:text-teal-200"
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
