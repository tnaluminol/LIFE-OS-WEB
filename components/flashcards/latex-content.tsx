'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface LatexContentProps {
  content: string;
  className?: string;
}

export function LatexContent({ content, className = '' }: LatexContentProps) {
  if (!content) return null;

  return (
    <div className={`prose dark:prose-invert max-w-none break-words text-inherit ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span className="inline-block leading-relaxed">{children}</span>,
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-[0.9em] font-mono font-medium">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
