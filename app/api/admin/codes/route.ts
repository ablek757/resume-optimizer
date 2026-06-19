import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword, unauthorizedResponse } from '@/lib/admin';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

    const [codes, total] = await Promise.all([
      prisma.redemptionCode.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.redemptionCode.count(),
    ]);

    return NextResponse.json({ codes, total, page, limit });
  } catch (error) {
    console.error('Admin codes error:', error);
    return NextResponse.json(
      { error: '获取兑换码列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!verifyAdminPassword(authHeader)) {
    return unauthorizedResponse();
  }

  try {
    const { type, value, count = 1, expiresInDays } = await req.json();

    if (!['credits', 'subscription_days'].includes(type)) {
      return NextResponse.json(
        { error: '类型必须是 credits 或 subscription_days' },
        { status: 400 }
      );
    }

    const numValue = Number(value);
    if (!numValue || numValue <= 0) {
      return NextResponse.json(
        { error: '数值必须大于 0' },
        { status: 400 }
      );
    }

    const numCount = Math.min(100, Math.max(1, Number(count)));
    const expiresAt = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : undefined;

    const codes: string[] = [];

    for (let i = 0; i < numCount; i++) {
      let code = generateCode();
      let attempts = 0;

      // 防止重复
      while (attempts < 5) {
        const existing = await prisma.redemptionCode.findUnique({
          where: { code },
        });
        if (!existing) break;
        code = generateCode();
        attempts++;
      }

      codes.push(code);
      await prisma.redemptionCode.create({
        data: {
          code,
          type,
          value: numValue,
          expiresAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      codes,
      type,
      value: numValue,
      count: codes.length,
    });
  } catch (error) {
    console.error('Admin create code error:', error);
    return NextResponse.json(
      { error: '创建兑换码失败' },
      { status: 500 }
    );
  }
}
