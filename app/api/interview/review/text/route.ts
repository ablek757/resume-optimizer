import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';
import {
  buildTextReviewPrompt,
  InterviewReviewResult,
} from '@/lib/interview-review-prompt';

const MAX_MESSAGES_LENGTH = 12000;

export const maxDuration = 60;

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      jobTitle,
      jobDescription,
      resume,
      language = 'zh',
    } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '缺少面试记录' }, { status: 400 });
    }

    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      return NextResponse.json({ error: '请输入目标岗位' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录后再使用', code: 'LOGIN_REQUIRED' },
        { status: 401 }
      );
    }

    const validMessages: ChatMessage[] = messages
      .filter(
        (m: unknown) =>
          m &&
          typeof (m as ChatMessage).role === 'string' &&
          typeof (m as ChatMessage).content === 'string'
      )
      .slice(0, 50);

    const dialogueText = validMessages.map((m) => m.content).join('\n');
    if (dialogueText.length > MAX_MESSAGES_LENGTH) {
      return NextResponse.json(
        { error: '面试记录过长，请缩短后重试' },
        { status: 400 }
      );
    }

    const apiKey = process.env.AI_API_KEY || process.env.KIMI_API_KEY;
    const baseURL =
      process.env.AI_BASE_URL || process.env.KIMI_BASE_URL || 'https://api.deepseek.com/v1';
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

    const prompt = buildTextReviewPrompt(
      jobTitle.trim(),
      validMessages,
      (resume || '').trim(),
      jobDescription?.trim(),
      validLanguage
    );

    const client = new OpenAI({ apiKey, baseURL });

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 2500,
    });

    const raw = response.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;

    let parsed: Partial<InterviewReviewResult>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Text review parse error:', parseErr, raw);
      return NextResponse.json(
        { error: 'AI 返回格式异常，请稍后重试' },
        { status: 500 }
      );
    }

    const result: InterviewReviewResult = {
      transcript: parsed.transcript || '',
      scores: {
        content: parsed.scores?.content ?? 0,
        expression: parsed.scores?.expression ?? 0,
        logic: parsed.scores?.logic ?? 0,
        overall: parsed.scores?.overall ?? 0,
      },
      paceAnalysis: parsed.paceAnalysis || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      exampleImprovements: Array.isArray(parsed.exampleImprovements)
        ? parsed.exampleImprovements
        : [],
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Text review error:', error);

    let message = '文字复盘失败，请稍后重试';
    if (error instanceof Error) {
      message = error.message;
      if (message.includes('Insufficient Balance') || message.includes('402')) {
        message = 'API 账户余额不足';
      } else if (message.includes('Incorrect API key')) {
        message = 'API Key 无效';
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
