import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_TEXT_LENGTH = 12000;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const versions = await prisma.resumeVersion.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        jobTitle: true,
        jobDescription: true,
        originalText: true,
        optimizedText: true,
        source: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Get resume versions error:', error);
    return NextResponse.json({ error: '获取简历版本失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const {
      title,
      jobTitle,
      jobDescription,
      originalText,
      optimizedText,
      source = 'manual',
      isDefault = false,
    } = await req.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: '请输入版本名称' }, { status: 400 });
    }

    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      return NextResponse.json({ error: '请输入目标岗位' }, { status: 400 });
    }

    if (!optimizedText || typeof optimizedText !== 'string' || optimizedText.trim().length === 0) {
      return NextResponse.json({ error: '优化后简历内容不能为空' }, { status: 400 });
    }

    const safeOriginalText =
      typeof originalText === 'string' ? originalText.slice(0, MAX_TEXT_LENGTH) : '';
    const safeOptimizedText = optimizedText.slice(0, MAX_TEXT_LENGTH);

    const version = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.resumeVersion.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.resumeVersion.create({
        data: {
          userId: user.id,
          title: title.trim(),
          jobTitle: jobTitle.trim(),
          jobDescription: (jobDescription || '').trim() || null,
          originalText: safeOriginalText || null,
          optimizedText: safeOptimizedText,
          source: source || 'manual',
          isDefault: Boolean(isDefault),
        },
      });
    });

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Create resume version error:', error);
    return NextResponse.json({ error: '保存简历版本失败' }, { status: 500 });
  }
}
