import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword, unauthorizedResponse } from '@/lib/admin';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');

  if (!verifyAdminPassword(authHeader)) {
    return unauthorizedResponse();
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    const [
      todayNewUsers,
      todayOptimizations,
      todayRevenue,
      totalUsers,
      totalOptimizations,
      totalOrders,
      totalRevenue,
      pendingOrders,
    ] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.optimizationHistory.count({
        where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.paymentOrder.aggregate({
        where: {
          status: 'approved',
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.user.count(),
      prisma.optimizationHistory.count(),
      prisma.paymentOrder.count(),
      prisma.paymentOrder.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
      }),
      prisma.paymentOrder.count({
        where: { status: 'pending' },
      }),
    ]);

    return NextResponse.json({
      today: {
        newUsers: todayNewUsers,
        optimizations: todayOptimizations,
        revenue: todayRevenue._sum.amount || 0,
      },
      totals: {
        users: totalUsers,
        optimizations: totalOptimizations,
        orders: totalOrders,
        revenue: totalRevenue._sum.amount || 0,
        pendingOrders,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: '获取分析数据失败' },
      { status: 500 }
    );
  }
}
