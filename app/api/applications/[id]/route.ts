import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_STATUSES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.jobApplication.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    const stringFields = [
      'company',
      'position',
      'jobTitle',
      'jobDescription',
      'source',
      'status',
      'salary',
      'location',
      'contact',
      'notes',
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          typeof body[field] === 'string' ? body[field].trim() || null : body[field];
      }
    }

    if (updateData.status && !VALID_STATUSES.includes(updateData.status as string)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }

    if (body.appliedAt !== undefined) {
      updateData.appliedAt = body.appliedAt ? new Date(body.appliedAt) : existing.appliedAt;
    }

    const application = await prisma.jobApplication.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json({ error: '更新投递记录失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.jobApplication.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    await prisma.jobApplication.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete application error:', error);
    return NextResponse.json({ error: '删除投递记录失败' }, { status: 500 });
  }
}
