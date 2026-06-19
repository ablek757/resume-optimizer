import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';
import { buildInterviewSystemPrompt } from '@/lib/interview-prompt';

const MAX_RESUME_LENGTH = 8000;

export const maxDuration = 60;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      jobTitle,
      resume,
      jobDescription,
      messages,
      language = 'zh',
    } = await req.json();

    if (!jobTitle || !resume) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (resume.length > MAX_RESUME_LENGTH) {
      return NextResponse.json(
        { error: `简历内容过长，请控制在 ${MAX_RESUME_LENGTH} 字以内` },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录后再使用', code: 'LOGIN_REQUIRED' },
        { status: 401 }
      );
    }

    const apiKey = process.env.AI_API_KEY || process.env.KIMI_API_KEY;
    const baseURL = process.env.AI_BASE_URL || process.env.KIMI_BASE_URL || 'https://api.deepseek.com/v1';
    const model = process.env.AI_MODEL || process.env.KIMI_MODEL || 'deepseek-chat';

    if (!apiKey) {
      return NextResponse.json(
        { error: '服务暂未配置 AI API Key，请联系管理员' },
        { status: 500 }
      );
    }

    const validLanguage = ['zh', 'en', 'bilingual'].includes(language)
      ? (language as 'zh' | 'en' | 'bilingual')
      : 'zh';

    const client = new OpenAI({ apiKey, baseURL });

    const systemPrompt = buildInterviewSystemPrompt(
      jobTitle.trim(),
      resume.trim(),
      jobDescription?.trim(),
      validLanguage
    );

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(messages || []),
    ];

    const response = await client.chat.completions.create({
      model,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const message = response.choices[0]?.message?.content;

    if (!message) {
      return NextResponse.json(
        { error: 'AI 未返回有效内容，请稍后重试' },
        { status: 500 }
      );
    }

    const done = message.includes('面试结束') || message.includes('Interview ended') || message.includes('面试已结束');

    return NextResponse.json({ message, done });
  } catch (error) {
    console.error('Interview next error:', error);

    let message = '面试继续失败，请稍后重试';
    if (error instanceof Error) {
      message = error.message;
      if (message.includes('Insufficient Balance') || message.includes('402')) {
        message = 'API 账户余额不足，请联系管理员';
      } else if (message.includes('Incorrect API key')) {
        message = 'API Key 无效，请检查配置';
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
