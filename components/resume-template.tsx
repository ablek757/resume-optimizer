'use client';

import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type ResumeTemplateType = 'classic' | 'modern' | 'minimal';

interface ResumeTemplateProps {
  content: string;
  template: ResumeTemplateType;
}

const templateClass: Record<ResumeTemplateType, string> = {
  classic:
    'bg-white text-slate-800 p-8 font-serif leading-relaxed prose prose-slate max-w-none ' +
    'prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:border-b prose-headings:border-slate-200 prose-headings:pb-1 prose-headings:mb-3 ' +
    'prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-strong:text-slate-900',
  modern:
    'bg-white text-slate-700 p-8 font-sans leading-relaxed prose prose-slate max-w-none ' +
    'prose-headings:font-bold prose-headings:text-blue-700 prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-sm prose-headings:mt-4 prose-headings:mb-2 ' +
    'prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-strong:text-slate-900 ' +
    '[&_h1]:text-2xl [&_h1]:text-blue-800 [&_h1]:border-b-2 [&_h1]:border-blue-100',
  minimal:
    'bg-white text-black p-6 font-sans text-sm leading-snug prose prose-slate max-w-none ' +
    'prose-headings:font-bold prose-headings:text-black prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-wider prose-headings:mt-3 prose-headings:mb-1 ' +
    'prose-p:my-0.5 prose-li:my-0 prose-ul:my-0.5 prose-strong:text-black ' +
    '[&_h1]:text-lg [&_h1]:border-b [&_h1]:border-black',
};

const ResumeTemplate = forwardRef<HTMLDivElement, ResumeTemplateProps>(
  ({ content, template }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-lg shadow-sm ring-1 ring-slate-200 ${templateClass[template]}`}
        style={{ minHeight: '600px' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }
);

ResumeTemplate.displayName = 'ResumeTemplate';
export default ResumeTemplate;
