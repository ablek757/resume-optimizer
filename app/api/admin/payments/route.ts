import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword, unauthorizedResponse } from '@/lib/admin';
import { getPackages, approveOrder } from '@/lib/payment';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');

  if (!verifyAdminPassword(authHeader)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const payments = await prisma.paymentOrder.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        redemptionCode: {
          select: { code: true, type: true, value: true },
        },
      },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: payments.map((p) => p.userId) } },
      select: { id: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.email]));

    return NextResponse.json({
      payments: payments.map((p) => ({
        ...p,
        userEmail: userMap.get(p.userId) || p.userId,
      })),
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json(
      { error: '获取订单列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');

  if (!verifyAdminPassword(authHeader)) {
    return unauthorizedResponse();
  }

  try {
    const { action, orderId, packageIndex } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单 ID' }, { status: 400 });
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (action === 'approve') {
      const packages = getPackages();
      const pkg =
        packageIndex !== undefined
          ? packages[packageIndex]
          : packages.find(
              (p) =>
                p.name === order.packageName &&
                p.type === order.packageType &&
                p.value === order.packageValue
            ) || null;

      if (!pkg) {
        return NextResponse.json(
          { error: '无法确定套餐，请选择套餐' },
          { status: 400 }
        );
      }

      const result = await approveOrder(orderId, pkg);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '发放失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, code: result.code });
    }

    if (action === 'reject') {
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { status: 'rejected', notes: '人工拒绝' },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Admin payment action error:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    );
  }
}
