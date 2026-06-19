import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')));
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      prisma.optimizationHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          jobTitle: true,
          jobDescription: true,
          originalText: true,
          result: true,
          createdAt: true,
        },
      }),
      prisma.optimizationHistory.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ histories, total, page, limit });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: '获取历史记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { jobTitle, jobDescription, originalText, result } = await req.json();

    if (!jobTitle || !result) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const history = await prisma.optimizationHistory.create({
      data: {
        userId: user.id,
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription?.trim() || null,
        originalText: (originalText || '').trim().slice(0, 1000),
        result: result.trim(),
      },
    });

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Create history error:', error);
    return NextResponse.json(
      { error: '保存历史记录失败' },
      { status: 500 }
    );
  }
}
