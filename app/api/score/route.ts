import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildScorePrompt } from '@/lib/score-prompt';
import { getCurrentUser } from '@/lib/auth';

const MAX_RESUME_LENGTH = 8000;

export const maxDuration = 60;

export interface ScoreResult {
  score: number;
  matchPercentage: number;
  summary: string;
  keywords: { word: string; matched: boolean; suggestion?: string }[];
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, resume, jobDescription } = await req.json();

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

    const prompt = buildScorePrompt(jobTitle.trim(), resume.trim(), jobDescription?.trim());

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1200,
    });

    const raw = response.choices[0]?.message?.content || '';

    // 尝试提取 JSON（兼容 Markdown 代码块）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;

    let result: Partial<ScoreResult>;
    try {
      result = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Score parse error:', parseErr, raw);
      return NextResponse.json(
        { error: 'AI 返回格式异常，请稍后重试' },
        { status: 500 }
      );
    }

    const normalized: ScoreResult = {
      score: typeof result.score === 'number' ? result.score : 0,
      matchPercentage: typeof result.matchPercentage === 'number' ? result.matchPercentage : 0,
      summary: result.summary || '',
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    };

    return NextResponse.json({ score: normalized });
  } catch (error) {
    console.error('Score error:', error);

    let message = '评分失败，请稍后重试';
    if (error instanceof Error) {
      message = error.message;
      if (message.includes('Insufficient Balance') || message.includes('402')) {
        message = 'API 账户余额不足，请充值或切换到 Mock 模式';
      } else if (message.includes('Incorrect API key')) {
        message = 'API Key 无效，请检查配置';
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
