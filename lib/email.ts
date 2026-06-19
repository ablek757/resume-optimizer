import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  // 测试模式：如果没有配置 Resend，直接打印到控制台
  if (!resend) {
    console.log(`[测试模式] 验证码邮件：${email} -> ${code}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'AI 简历优化 - 登录验证码',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">AI 简历优化</h2>
        <p>您的登录验证码是：</p>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #64748b;">验证码 10 分钟内有效，请勿泄露给他人。</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  if (!resend) {
    console.log(`[测试模式] 欢迎邮件：${email}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '欢迎来到 AI 简历优化',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">AI 简历优化</h2>
        <p>你好，欢迎加入 AI 简历优化！</p>
        <p>你每天可以免费体验 ${process.env.FREE_DAILY_LIMIT || '3'} 次简历优化。如果需要更多额度或无限次会员，可以在首页购买兑换。</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://resume-optimizer-smoky.vercel.app'}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
            立即优化简历
          </a>
        </p>
        <p style="color: #64748b; margin-top: 20px;">祝求职顺利！</p>
      </div>
    `,
  });
}

export async function sendQuotaReminderEmail(
  email: string,
  remainingFree: number,
  credits: number
): Promise<void> {
  if (!resend) {
    console.log(`[测试模式] 额度提醒：${email}，剩余免费 ${remainingFree}，额度 ${credits}`);
    return;
  }

  const noQuota = remainingFree === 0 && credits === 0;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: noQuota ? '你的今日免费额度已用完' : '你的简历优化额度即将用完',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">AI 简历优化</h2>
        <p>你好，</p>
        <p>
          ${noQuota
            ? '你今天的免费优化次数已用完。'
            : `你今日还剩 ${remainingFree} 次免费优化机会。`}
          如果需要继续优化更多简历，可以购买额度或兑换会员。
        </p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://resume-optimizer-smoky.vercel.app'}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
            去购买额度
          </a>
        </p>
        <p style="color: #64748b; margin-top: 20px;">感谢使用 AI 简历优化。</p>
      </div>
    `,
  });
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
