import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, setAuthCookie } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: '请输入邮箱和验证码' },
        { status: 400 }
      );
    }

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      );
    }

    // 删除已使用的验证码
    await prisma.verificationCode.deleteMany({
      where: { email },
    });

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { email },
    });

    const isNewUser = !user;
    if (!user) {
      user = await prisma.user.create({
        data: { email },
      });
    }

    if (isNewUser) {
      sendWelcomeEmail(user.email).catch((err) => {
        console.error('Send welcome email error:', err);
      });
    }

    const token = createToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        subscriptionEndsAt: user.subscriptionEndsAt,
        dailyFreeUses: user.dailyFreeUses,
      },
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
