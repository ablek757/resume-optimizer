import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const maxDuration = 60;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as unknown as new (
      context?: unknown,
      needRawText?: boolean
    ) => PDFParserInstance)(null, true);

    pdfParser.on('pdfParser_dataReady', () => {
      let text = pdfParser.getRawTextContent();
      // 清理 pdf2json 添加的分页标记
      text = text.replace(/----------------Page \(\d+\) Break----------------/g, '');
      resolve(text.trim());
    });

    pdfParser.on('pdfParser_dataError', (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      reject(error);
    });

    pdfParser.parseBuffer(buffer);
  });
}

interface PDFParserInstance {
  on(event: string, listener: (...args: unknown[]) => void): void;
  getRawTextContent(): string;
  parseBuffer(buffer: Buffer, verbosity?: number): void;
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.VISION_API_KEY || process.env.AI_API_KEY;
  const baseURL = process.env.VISION_BASE_URL || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.VISION_MODEL || 'moonshot-v1-8k-vision-preview';

  if (!apiKey) {
    throw new Error('未配置图片 OCR 所需的 API Key，请设置 VISION_API_KEY 或 AI_API_KEY');
  }

  // 部分模型（如 DeepSeek）不支持图片输入
  if (baseURL.includes('deepseek.com') && !process.env.VISION_BASE_URL) {
    throw new Error(
      'DeepSeek 暂不支持图片 OCR。请配置支持视觉的模型，如 Kimi、Gemini、Claude 或 GPT-4o（设置 VISION_API_KEY + VISION_BASE_URL + VISION_MODEL）'
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请提取这张简历图片中的所有文字内容，尽量保持原有排版和换行，只输出文字，不要添加任何解释。',
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('图片 OCR 未返回文字内容');
  }

  return content.trim();
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPDF(type: string, name: string): boolean {
  return type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
}

function isWord(type: string, name: string): boolean {
  return (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.toLowerCase().endsWith('.docx')
  );
}

function isImage(type: string, name: string): boolean {
  return type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小不能超过 5MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = '';

    if (isPDF(file.type, file.name)) {
      text = await extractTextFromPDF(buffer);
    } else if (isWord(file.type, file.name)) {
      text = await extractTextFromWord(buffer);
    } else if (isImage(file.type, file.name)) {
      text = await extractTextFromImage(buffer, file.type || 'image/png');
    } else {
      return NextResponse.json(
        { error: '仅支持 PDF、Word（docx）或图片文件（PNG、JPG、WebP、GIF、BMP）' },
        { status: 400 }
      );
    }

    if (!text || text.length === 0) {
      return NextResponse.json(
        { error: '未能从文件中提取到文字，请尝试粘贴简历内容' },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Extract text error:', error);

    let message = '文字提取失败，请稍后重试或直接粘贴简历内容';

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
