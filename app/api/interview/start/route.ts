import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';
import { checkQuota, deductQuota } from '@/lib/quota';
import { buildInterviewSystemPrompt } from '@/lib/interview-prompt';

const MAX_RESUME_LENGTH = 8000;
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || '3');

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, resume, jobDescription, language = 'zh' } = await req.json();

    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      return NextResponse.json({ error: '请输入目标岗位' }, { status: 400 });
    }

    if (!resume || typeof resume !== 'string' || resume.trim().length === 0) {
      return NextResponse.json({ error: '请输入简历内容' }, { status: 400 });
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

    const quota = await checkQuota(user.id);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason || '额度不足',
          code: 'QUOTA_EXCEEDED',
          dailyFreeLimit: FREE_DAILY_LIMIT,
          dailyFreeUses: quota.dailyFreeUses,
          credits: quota.credits,
          hasSubscription: quota.hasSubscription,
        },
        { status: 403 }
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

    const client = new OpenAI({ apiKey, baseURL });

    const validLanguage = ['zh', 'en', 'bilingual'].includes(language)
      ? (language as 'zh' | 'en' | 'bilingual')
      : 'zh';

    const systemPrompt = buildInterviewSystemPrompt(
      jobTitle.trim(),
      resume.trim(),
      jobDescription?.trim(),
      validLanguage
    );

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '面试官，请开始提问。' },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const message = response.choices[0]?.message?.content;

    if (!message) {
      return NextResponse.json(
        { error: 'AI 未返回有效内容，请稍后重试' },
        { status: 500 }
      );
    }

    await deductQuota(user.id);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Interview start error:', error);

    let message = '开始面试失败，请稍后重试';
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
