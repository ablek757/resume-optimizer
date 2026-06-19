import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildJDRewritePrompt } from '@/lib/jd-rewrite-prompt';
import { getCurrentUser } from '@/lib/auth';
import { checkQuota, deductQuota } from '@/lib/quota';

const MAX_RESUME_LENGTH = 8000;
const MAX_JD_LENGTH = 6000;
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || '3');

export const maxDuration = 60;

export interface JDRewriteResult {
  rewrittenResume: string;
  addedKeywords: string[];
  removedKeywords: string[];
  matchedKeywords: string[];
  matchPercentage: number;
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, resume, jobDescription, language = 'zh' } = await req.json();

    const validLanguage = ['zh', 'en', 'bilingual'].includes(language)
      ? (language as 'zh' | 'en' | 'bilingual')
      : 'zh';

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

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'JD 关键词改写需要岗位 JD，请先粘贴招聘要求' },
        { status: 400 }
      );
    }

    if (jobDescription.length > MAX_JD_LENGTH) {
      return NextResponse.json(
        { error: `JD 过长，请控制在 ${MAX_JD_LENGTH} 字以内` },
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

    const prompt = buildJDRewritePrompt(
      jobTitle.trim(),
      resume.trim(),
      jobDescription.trim(),
      validLanguage
    );

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 2500,
    });

    const raw = response.choices[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;

    let parsed: Partial<JDRewriteResult>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('JD rewrite parse error:', parseErr, raw);
      return NextResponse.json(
        { error: 'AI 返回格式异常，请稍后重试' },
        { status: 500 }
      );
    }

    const result: JDRewriteResult = {
      rewrittenResume: parsed.rewrittenResume || '',
      addedKeywords: Array.isArray(parsed.addedKeywords) ? parsed.addedKeywords : [],
      removedKeywords: Array.isArray(parsed.removedKeywords) ? parsed.removedKeywords : [],
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
      matchPercentage: typeof parsed.matchPercentage === 'number' ? parsed.matchPercentage : 0,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };

    await deductQuota(user.id);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('JD rewrite error:', error);

    let message = 'JD 改写失败，请稍后重试';
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
