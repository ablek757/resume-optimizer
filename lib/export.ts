'use client';

import { saveAs } from 'file-saver';

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadMarkdown(content: string, filename: string = '简历优化结果') {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${filename}.md`);
}

const PDF_BASE_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; }
  h1 { font-size: 26px; font-weight: 700; color: #111827; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-top: 0; margin-bottom: 16px; page-break-inside: avoid; }
  h2 { font-size: 14px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; page-break-inside: avoid; }
  h3 { font-size: 14px; font-weight: 600; color: #374151; margin-top: 12px; margin-bottom: 4px; page-break-inside: avoid; }
  p { margin: 4px 0; line-height: 1.6; }
  ul { margin: 6px 0; padding-left: 20px; }
  li { margin: 2px 0; }
  strong { color: #111827; }
`;

function cloneForExport(element: HTMLElement): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '210mm';
  clone.style.minHeight = '297mm';
  clone.style.maxWidth = '210mm';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.border = 'none';
  clone.classList.remove('ring-1', 'ring-slate-200', 'rounded-lg', 'shadow-sm');

  container.appendChild(clone);
  return container;
}

export async function exportToWord(
  htmlContent: string,
  filename: string = '简历优化结果'
) {
  if (typeof window === 'undefined') return;

  const htmlDocx = await import('html-docx-js/dist/html-docx');
  const fullHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>${PDF_BASE_STYLES}</style>
      </head>
      <body style="padding: 20px;">${htmlContent}</body>
    </html>
  `;
  const converted = htmlDocx.default.asBlob(fullHtml);
  saveAs(converted, `${filename}.docx`);
}

export async function exportToPDF(
  element: HTMLElement,
  filename: string = '简历优化结果'
) {
  if (typeof window === 'undefined') return;

  const container = cloneForExport(element);

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `${filename}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        width: 794,
        windowWidth: 794,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },
      pagebreak: {
        mode: ['css', 'legacy'] as ('css' | 'legacy')[],
        avoid: ['h1', 'h2', 'h3', 'li', 'p'],
      },
    };

    await html2pdf().set(opt).from(container.firstElementChild as HTMLElement).save();
  } finally {
    document.body.removeChild(container);
  }
}

export function exportResumeToMarkdown(
  content: string,
  filename: string = '优化版简历'
) {
  downloadMarkdown(content, filename);
}

export async function exportResumeToWord(
  htmlContent: string,
  filename: string = '优化版简历'
) {
  await exportToWord(htmlContent, filename);
}

export async function exportResumeToPDF(
  element: HTMLElement,
  filename: string = '优化版简历'
) {
  await exportToPDF(element, filename);
}
