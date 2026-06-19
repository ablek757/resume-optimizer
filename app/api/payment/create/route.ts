import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPackages } from '@/lib/payment';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { packageIndex } = await req.json();
    const packages = getPackages();

    if (
      typeof packageIndex !== 'number' ||
      packageIndex < 0 ||
      packageIndex >= packages.length
    ) {
      return NextResponse.json({ error: '套餐选择无效' }, { status: 400 });
    }

    const pkg = packages[packageIndex];

    // 限制每个用户只能有一个 pending 订单
    const existingPending = await prisma.paymentOrder.findFirst({
      where: { userId: user.id, status: 'pending' },
    });

    if (existingPending) {
      return NextResponse.json({
        orderId: existingPending.id,
        package: pkg,
        qrUrl: '/wechat-qr.jpg',
        message: '你已有未完成的订单，请继续支付并上传截图',
      });
    }

    const order = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        status: 'pending',
        screenshot: '',
      },
    });

    return NextResponse.json({
      orderId: order.id,
      package: pkg,
      qrUrl: '/wechat-qr.jpg',
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    return NextResponse.json(
      { error: '创建订单失败，请稍后重试' },
      { status: 500 }
    );
  }
}
