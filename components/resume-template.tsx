'use client';

import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type ResumeTemplateType = 'classic' | 'modern' | 'minimal' | 'professional';

interface ResumeTemplateProps {
  content: string;
  template: ResumeTemplateType;
  forExport?: boolean;
}

const baseWrapper =
  'bg-white text-slate-800 leading-relaxed prose prose-slate max-w-none overflow-hidden';

const templateClass: Record<ResumeTemplateType, string> = {
  classic:
    `${baseWrapper} p-8 font-serif ` +
    'prose-headings:font-semibold prose-headings:text-slate-900 ' +
    'prose-headings:border-b prose-headings:border-slate-200 prose-headings:pb-1 prose-headings:mb-3 prose-headings:mt-5 ' +
    'prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-strong:text-slate-900 ' +
    'prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b-2 prose-h1:border-slate-900 prose-h1:pb-2 ' +
    '[&_ul]:list-disc [&_ul]:pl-5',
  modern:
    `${baseWrapper} p-8 font-sans ` +
    'prose-headings:font-bold prose-headings:text-blue-700 prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-sm prose-headings:mt-5 prose-headings:mb-2 ' +
    'prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-strong:text-slate-900 ' +
    'prose-h1:text-2xl prose-h1:text-blue-800 prose-h1:border-b-2 prose-h1:border-blue-100 prose-h1:pb-2 ' +
    '[&_ul]:list-disc [&_ul]:pl-5',
  minimal:
    `${baseWrapper} p-6 font-sans text-sm leading-snug ` +
    'prose-headings:font-bold prose-headings:text-black prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-wider prose-headings:mt-4 prose-headings:mb-1 ' +
    'prose-p:my-0.5 prose-li:my-0 prose-ul:my-0.5 prose-strong:text-black ' +
    'prose-h1:text-lg prose-h1:border-b prose-h1:border-black prose-h1:pb-1 ' +
    '[&_ul]:list-disc [&_ul]:pl-5',
  professional:
    `${baseWrapper} p-0 font-sans ` +
    '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:m-0 [&_h1]:border-0 [&_h1]:p-0 ' +
    '[&_h2]:text-xs [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-blue-700 [&_h2]:border-b [&_h2]:border-blue-100 [&_h2]:pb-1 [&_h2]:mb-2 [&_h2]:mt-4 ' +
    '[&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_strong]:text-slate-900 ' +
    '[&_ul]:list-disc [&_ul]:pl-5',
};

const professionalHeader = (
  <div
    className="professional-header bg-slate-900 px-8 py-6 text-white"
    style={{ pageBreakInside: 'avoid' }}
  >
    <div className="text-sm font-light tracking-wide text-blue-200">RESUME</div>
  </div>
);

const ResumeTemplate = forwardRef<HTMLDivElement, ResumeTemplateProps>(
  ({ content, template, forExport }, ref) => {
    const isProfessional = template === 'professional';

    return (
      <div
        ref={ref}
        data-template={template}
        className={`resume-template ${templateClass[template]} ${
          forExport ? 'ring-0 shadow-none' : 'rounded-lg shadow-sm ring-1 ring-slate-200'
        }`}
        style={{
          width: forExport ? '210mm' : '100%',
          minHeight: forExport ? '297mm' : '600px',
          maxWidth: '100%',
        }}
      >
        {isProfessional && professionalHeader}
        <div className={isProfessional ? 'px-8 pb-8 pt-5' : ''}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }
);

ResumeTemplate.displayName = 'ResumeTemplate';
export default ResumeTemplate;
