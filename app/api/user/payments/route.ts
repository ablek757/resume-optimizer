import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const payments = await prisma.paymentOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        redemptionCode: {
          select: { code: true, type: true, value: true },
        },
      },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Get user payments error:', error);
    return NextResponse.json(
      { error: '获取订单列表失败' },
      { status: 500 }
    );
  }
}
