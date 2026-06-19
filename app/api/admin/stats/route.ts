import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword, unauthorizedResponse } from '@/lib/admin';

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!verifyAdminPassword(authHeader)) {
    return unauthorizedResponse();
  }

  try {
    const [
      totalUsers,
      totalCodes,
      usedCodes,
      totalOptimizations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.redemptionCode.count(),
      prisma.redemptionCode.count({ where: { usedBy: { not: null } } }),
      // 估算总优化次数：credits 兑换总量 + 免费使用次数（粗略）
      prisma.redemptionCode.aggregate({
        where: { type: 'credits' },
        _sum: { value: true },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalCodes,
      usedCodes,
      totalOptimizations: totalOptimizations._sum.value || 0,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
