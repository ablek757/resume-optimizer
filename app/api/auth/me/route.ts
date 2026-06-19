import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasActiveSubscription, getTodayString } from '@/lib/quota';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const today = getTodayString();
    const dailyFreeUses = user.lastFreeUseDate === today ? user.dailyFreeUses : 0;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        subscriptionEndsAt: user.subscriptionEndsAt,
        hasSubscription: hasActiveSubscription(user.subscriptionEndsAt),
        dailyFreeUses,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
