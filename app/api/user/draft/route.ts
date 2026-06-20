import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const draft = await prisma.userDraft.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Get draft error:', error);
    return NextResponse.json({ error: '获取草稿失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { jobTitle, jobDescription, resume } = await req.json();

    const draft = await prisma.userDraft.upsert({
      where: { userId: user.id },
      update: {
        jobTitle: typeof jobTitle === 'string' ? jobTitle : null,
        jobDescription: typeof jobDescription === 'string' ? jobDescription : null,
        resume: typeof resume === 'string' ? resume : null,
      },
      create: {
        userId: user.id,
        jobTitle: typeof jobTitle === 'string' ? jobTitle : null,
        jobDescription: typeof jobDescription === 'string' ? jobDescription : null,
        resume: typeof resume === 'string' ? resume : null,
      },
    });

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json({ error: '保存草稿失败' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    await prisma.userDraft.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json({ error: '删除草稿失败' }, { status: 500 });
  }
}
