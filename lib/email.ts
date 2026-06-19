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

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
