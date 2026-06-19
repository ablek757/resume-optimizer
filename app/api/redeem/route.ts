import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { redeemCode } from '@/lib/quota';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: '请输入兑换码' },
        { status: 400 }
      );
    }

    const result = await redeemCode(user.id, code.trim());

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json(
      { error: '兑换失败，请稍后重试' },
      { status: 500 }
    );
  }
}
