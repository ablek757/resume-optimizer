import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode, generateVerificationCode } from '@/lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_EXPIRES_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

    // 删除该邮箱旧的验证码
    await prisma.verificationCode.deleteMany({
      where: { email },
    });

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    await sendVerificationCode(email, code);

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 测试模式下返回验证码，方便调试
      code: process.env.RESEND_API_KEY ? undefined : code,
    });
  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { error: '发送验证码失败，请稍后重试' },
      { status: 500 }
    );
  }
}
