import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildOptimizePrompt } from '@/lib/prompt';
import { mockOptimizeResult } from '@/lib/mock-response';
import { getCurrentUser } from '@/lib/auth';
import { checkQuota, deductQuota, hasActiveSubscription } from '@/lib/quota';
import { prisma } from '@/lib/prisma';
import { sendQuotaReminderEmail } from '@/lib/email';

const MAX_RESUME_LENGTH = 8000;
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || '3');

export const maxDuration = 60;

async function maybeSendQuotaReminder(userId: string) {
  try {
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!updatedUser) return;
    if (hasActiveSubscription(updatedUser.subscriptionEndsAt)) return;

    const today = new Date().toISOString().split('T')[0];
    const dailyFreeUses =
      updatedUser.lastFreeUseDate === today ? updatedUser.dailyFreeUses : 0;
    const remainingFree = Math.max(0, FREE_DAILY_LIMIT - dailyFreeUses);

    if (remainingFree <= 1 || updatedUser.credits === 0) {
      sendQuotaReminderEmail(updatedUser.email, remainingFree, updatedUser.credits).catch(
        (err) => console.error('Send quota reminder error:', err)
      );
    }
  } catch (err) {
    console.error('Quota reminder check error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, resume, jobDescription, language = 'zh' } = await req.json();

    const validLanguage = ['zh', 'en', 'bilingual'].includes(language)
      ? (language as 'zh' | 'en' | 'bilingual')
      : 'zh';

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

    const apiKey = process.env.AI_API_KEY || process.env.KIMI_API_KEY;
    const baseURL = process.env.AI_BASE_URL || process.env.KIMI_BASE_URL || 'https://api.deepseek.com/v1';
    const model = process.env.AI_MODEL || process.env.KIMI_MODEL || 'deepseek-chat';

    if (!apiKey) {
      return NextResponse.json(
        { error: '服务暂未配置 AI API Key，请联系管理员' },
        { status: 500 }
      );
    }

    const prompt = buildOptimizePrompt(
      jobTitle.trim(),
      resume.trim(),
      jobDescription?.trim(),
      validLanguage
    );

    // Mock 模式：以流的形式返回示例结果
    if (process.env.MOCK_MODE === 'true') {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const char of mockOptimizeResult) {
            controller.enqueue(encoder.encode(char));
            // 模拟打字延迟，避免一次性发送
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
          controller.close();
          await deductQuota(user.id);
          await maybeSendQuotaReminder(user.id);
          prisma.optimizationHistory.create({
            data: {
              userId: user.id,
              jobTitle: jobTitle.trim(),
              jobDescription: jobDescription?.trim() || null,
              originalText: resume.trim().slice(0, 1000),
              result: mockOptimizeResult,
            },
          }).catch((err) => {
            console.error('Save optimization history error:', err);
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const client = new OpenAI({
      apiKey,
      baseURL,
    });

    const aiStream = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        try {
          for await (const chunk of aiStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          controller.close();

          // 流结束后扣除额度并保存历史（不阻塞响应）
          await deductQuota(user.id);
          await maybeSendQuotaReminder(user.id);
          prisma.optimizationHistory.create({
            data: {
              userId: user.id,
              jobTitle: jobTitle.trim(),
              jobDescription: jobDescription?.trim() || null,
              originalText: resume.trim().slice(0, 1000),
              result: fullContent,
            },
          }).catch((err) => {
            console.error('Save optimization history error:', err);
          });
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
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
