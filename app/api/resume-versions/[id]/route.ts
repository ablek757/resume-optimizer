import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_TEXT_LENGTH = 12000;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      title,
      jobTitle,
      jobDescription,
      originalText,
      optimizedText,
      source,
      isDefault,
    } = body;

    const existing = await prisma.resumeVersion.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle.trim();
    if (jobDescription !== undefined) {
      updateData.jobDescription = (jobDescription || '').trim() || null;
    }
    if (originalText !== undefined) {
      updateData.originalText =
        typeof originalText === 'string' ? originalText.slice(0, MAX_TEXT_LENGTH) : null;
    }
    if (optimizedText !== undefined) {
      updateData.optimizedText = optimizedText.slice(0, MAX_TEXT_LENGTH);
    }
    if (source !== undefined) updateData.source = source;
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

    const version = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.resumeVersion.updateMany({
          where: { userId: user.id, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.resumeVersion.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Update resume version error:', error);
    return NextResponse.json({ error: '更新简历版本失败' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.resumeVersion.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    await prisma.resumeVersion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete resume version error:', error);
    return NextResponse.json({ error: '删除简历版本失败' }, { status: 500 });
  }
}
