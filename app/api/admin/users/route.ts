import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword, unauthorizedResponse } from '@/lib/admin';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!verifyAdminPassword(authHeader)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          credits: true,
          subscriptionEndsAt: true,
          dailyFreeUses: true,
          lastFreeUseDate: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}
