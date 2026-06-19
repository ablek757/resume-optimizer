import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';
import { checkQuota, deductQuota } from '@/lib/quota';
import {
  buildAudioReviewPrompt,
  InterviewReviewResult,
} from '@/lib/interview-review-prompt';

const MAX_AUDIO_SIZE_MB = 3;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || '3');

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      audioBase64,
      format = 'wav',
      jobTitle,
      jobDescription,
      resume,
      language = 'zh',
    } = await req.json();

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return NextResponse.json({ error: '请上传音频文件' }, { status: 400 });
    }

    const approximateSize = (audioBase64.length * 3) / 4;
    if (approximateSize > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: `音频文件过大，请压缩到 ${MAX_AUDIO_SIZE_MB}MB 以内` },
        { status: 400 }
      );
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

    const apiKey =
      process.env.AUDIO_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      process.env.VISION_API_KEY;
    const baseURL =
      process.env.AUDIO_BASE_URL ||
      process.env.VISION_BASE_URL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = process.env.AUDIO_REVIEW_MODEL || 'qwen-omni-turbo';

    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 Qwen API Key，无法分析音频' },
        { status: 500 }
      );
    }

    const validLanguage = ['zh', 'en', 'bilingual'].includes(language)
      ? (language as 'zh' | 'en' | 'bilingual')
      : 'zh';

    const prompt = buildAudioReviewPrompt(
      jobTitle.trim(),
      (resume || '').trim(),
      jobDescription?.trim(),
      validLanguage
    );

    const client = new OpenAI({ apiKey, baseURL });

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: audioBase64, format },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      modalities: ['text'],
      stream: false,
    });

    const raw = response.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;

    let parsed: Partial<InterviewReviewResult>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Audio review parse error:', parseErr, raw);
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

    await deductQuota(user.id);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Audio review error:', error);

    let message = '音频复盘失败，请稍后重试';
    if (error instanceof Error) {
      message = error.message;
      if (message.includes('Insufficient Balance') || message.includes('402')) {
        message = 'Qwen API 余额不足';
      } else if (message.includes('Incorrect API key')) {
        message = 'Qwen API Key 无效';
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
