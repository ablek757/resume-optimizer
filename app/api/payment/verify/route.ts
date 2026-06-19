import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { matchPackage, approveOrder, validateScreenshotSize } from '@/lib/payment';
import { recognizePaymentScreenshot } from '@/lib/vision';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const formData = await req.formData();
    const orderId = formData.get('orderId') as string;
    const file = formData.get('screenshot');

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单 ID' }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '请上传付款截图' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '截图大小不能超过 2MB' }, { status: 400 });
    }

    const order = await prisma.paymentOrder.findFirst({
      where: { id: orderId, userId: user.id },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (order.status === 'approved') {
      return NextResponse.json({ error: '订单已处理' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    if (!validateScreenshotSize(base64, MAX_FILE_SIZE)) {
      return NextResponse.json({ error: '截图大小不能超过 2MB' }, { status: 400 });
    }

    // 保存截图
    await prisma.paymentOrder.update({
      where: { id: orderId },
      data: { screenshot: base64 },
    });

    // AI 识别
    let recognized;
    try {
      recognized = await recognizePaymentScreenshot(base64, file.type || 'image/png');
    } catch (err) {
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: 'pending',
          notes: `识别失败：${err instanceof Error ? err.message : '未知错误'}`,
        },
      });
      return NextResponse.json(
        { error: '截图识别失败，请稍后重试或联系客服', orderId },
        { status: 400 }
      );
    }

    await prisma.paymentOrder.update({
      where: { id: orderId },
      data: { recognizedText: recognized.text },
    });

    if (recognized.amount === null) {
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: 'pending',
          notes: '未能识别支付金额，等待人工审核',
        },
      });
      return NextResponse.json(
        { error: '未能识别支付金额，已提交人工审核', orderId },
        { status: 400 }
      );
    }

    const pkg = matchPackage(recognized.amount);

    if (!pkg) {
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          amount: recognized.amount,
          status: 'pending',
          notes: `识别金额 ${recognized.amount} 元未匹配到套餐，等待人工审核`,
        },
      });
      return NextResponse.json(
        { error: `识别金额 ${recognized.amount} 元未匹配到套餐，已提交人工审核`, orderId },
        { status: 400 }
      );
    }

    // 自动发放兑换码
    const result = await approveOrder(orderId, pkg);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '发放兑换码失败', orderId },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      amount: recognized.amount,
      package: pkg,
      orderId,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: '处理失败，请稍后重试' },
      { status: 500 }
    );
  }
}
