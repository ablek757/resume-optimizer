'use client';

import { saveAs } from 'file-saver';

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadMarkdown(content: string, filename: string = '简历优化结果') {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${filename}.md`);
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
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
          h1, h2, h3 { color: #111; }
          ul, ol { padding-left: 20px; }
        </style>
      </head>
      <body>${htmlContent}</body>
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

  const html2pdf = (await import('html2pdf.js')).default;
  const opt = {
    margin: [10, 10] as [number, number],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  };

  await html2pdf().set(opt).from(element).save();
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
