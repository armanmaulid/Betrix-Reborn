'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeMarkdown } from './markdown-normalize';

/**
 * Terminal-themed Markdown renderer for AI responses.
 *
 * `react-markdown` builds a React virtual DOM (no `dangerouslySetInnerHTML`),
 * so LLM output is safe from XSS by default. `remark-gfm` enables the GitHub
 * Flavored Markdown extensions the models actually emit — tables, strikethrough,
 * task lists and autolinked URLs.
 *
 * Styling maps every Markdown element onto the app's Bloomberg-terminal tokens
 * (accent / positive / negative / info / muted-foreground / border) rather than
 * browser defaults, so a rendered response reads as part of the terminal UI
 * instead of a pasted webpage.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="text-sm font-bold text-foreground border-b border-border/70 pb-1.5 mt-4 mb-2 first:mt-0 tracking-wide uppercase">
              {props.children}
            </h1>
          ),
          h2: (props) => (
            <h2 className="text-[13px] font-bold text-accent mt-4 mb-1.5 tracking-wide">
              {props.children}
            </h2>
          ),
          h3: (props) => (
            <h3 className="text-xs font-bold text-foreground mt-3 mb-1 tracking-wide">
              {props.children}
            </h3>
          ),
          h4: (props) => (
            <h4 className="text-xs font-bold text-muted-foreground mt-2.5 mb-1 tracking-wide">
              {props.children}
            </h4>
          ),
          p: (props) => (
            <p className="text-xs leading-relaxed text-foreground/90 my-1.5">{props.children}</p>
          ),
          strong: (props) => (
            <strong className="font-bold text-foreground">{props.children}</strong>
          ),
          em: (props) => <em className="italic text-muted-foreground">{props.children}</em>,
          a: (props) => (
            <a
              href={props.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-info underline decoration-info/40 underline-offset-2 hover:text-accent"
            >
              {props.children}
            </a>
          ),
          ul: (props) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{props.children}</ul>,
          ol: (props) => (
            <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{props.children}</ol>
          ),
          li: (props) => <li className="text-xs text-foreground/90 leading-relaxed">{props.children}</li>,
          blockquote: (props) => (
            <blockquote className="border-l-2 border-accent/50 bg-black/40 pl-3 py-1 my-2 text-muted-foreground italic">
              {props.children}
            </blockquote>
          ),
          hr: () => <hr className="border-border/60 my-3" />,
          code: (props) => {
            const { className: codeClassName, children } = props;
            const isBlock = /language-/.test(codeClassName ?? '');
            if (isBlock) {
              return (
                <code className="block text-[11px] font-mono text-info whitespace-pre-wrap break-words">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1 py-0.5 bg-black border border-border/60 rounded-sm text-[11px] font-mono text-info">
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre className="bg-black border border-border/60 p-3 my-2 overflow-x-auto text-[11px] font-mono leading-relaxed">
              {props.children}
            </pre>
          ),
          table: (props) => (
            <div className="overflow-x-auto my-2.5">
              <table className="w-full text-[11px] font-mono border-collapse">{props.children}</table>
            </div>
          ),
          thead: (props) => <thead className="bg-black">{props.children}</thead>,
          th: (props) => (
            <th className="px-2 py-1 border border-border text-left text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              {props.children}
            </th>
          ),
          td: (props) => (
            <td className="px-2 py-1 border border-border text-foreground/90 tabular-nums align-top">
              {props.children}
            </td>
          ),
          tr: (props) => <tr className="hover:bg-surface/40">{props.children}</tr>,
          del: (props) => <del className="text-muted-foreground line-through">{props.children}</del>
        }}
      >
        {normalizeMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
