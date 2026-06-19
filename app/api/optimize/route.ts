import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildOptimizePrompt } from '@/lib/prompt';
import { mockOptimizeResult } from '@/lib/mock-response';
import { getCurrentUser } from '@/lib/auth';
import { checkQuota, deductQuota } from '@/lib/quota';
import { prisma } from '@/lib/prisma';

const MAX_RESUME_LENGTH = 8000;
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || '3');

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, resume, jobDescription } = await req.json();

    // 基础校验
    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入目标岗位' },
        { status: 400 }
      );
    }

    if (!resume || typeof resume !== 'string' || resume.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入简历内容' },
        { status: 400 }
      );
    }

    if (resume.length > MAX_RESUME_LENGTH) {
      return NextResponse.json(
        { error: `简历内容过长，请控制在 ${MAX_RESUME_LENGTH} 字以内` },
        { status: 400 }
      );
    }

    // 检查用户额度
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

    // Mock 模式：不调用真实 API，直接返回示例结果（用于演示或余额不足时）
    if (process.env.MOCK_MODE === 'true') {
      await deductQuota(user.id);
      return NextResponse.json({ result: mockOptimizeResult });
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

    const client = new OpenAI({
      apiKey,
      baseURL,
    });

    const prompt = buildOptimizePrompt(jobTitle.trim(), resume.trim(), jobDescription?.trim());

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: false,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'AI 未返回有效内容，请稍后重试' },
        { status: 500 }
      );
    }

    // 扣除额度（在 AI 调用成功后才扣）
    await deductQuota(user.id);

    // 保存优化历史记录（异步，不阻塞返回）
    prisma.optimizationHistory.create({
      data: {
        userId: user.id,
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription?.trim() || null,
        originalText: resume.trim().slice(0, 1000),
        result: content,
      },
    }).catch((err) => {
      console.error('Save optimization history error:', err);
    });

    return NextResponse.json({ result: content });
  } catch (error) {
    console.error('Optimize error:', error);

    let message = '请求失败，请稍后重试';

    if (error instanceof Error) {
      message = error.message;

      // 针对常见 API 错误给出更友好的提示
      if (message.includes('Insufficient Balance') || message.includes('402')) {
        message = 'API 账户余额不足，请充值或切换到 Mock 模式（MOCK_MODE=true）预览效果';
      } else if (message.includes('Incorrect API key')) {
        message = 'API Key 无效，请检查 .env.local 中的 AI_API_KEY 配置';
      } else if (message.includes('Rate limit')) {
        message = 'API 请求过于频繁，请稍后再试';
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
