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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const applications = await prisma.jobApplication.findMany({
      where: {
        userId: user.id,
        status: status ? status : undefined,
      },
      orderBy: { appliedAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json({ error: '获取投递记录失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const {
      company,
      position,
      jobTitle,
      jobDescription,
      source,
      status,
      salary,
      location,
      contact,
      notes,
      appliedAt,
    } = body;

    if (!company || !position || !jobTitle) {
      return NextResponse.json(
        { error: '请填写公司、职位和目标岗位' },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        company: company.trim(),
        position: position.trim(),
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription?.trim() || null,
        source: source?.trim() || null,
        status: VALID_STATUSES.includes(status) ? status : 'applied',
        salary: salary?.trim() || null,
        location: location?.trim() || null,
        contact: contact?.trim() || null,
        notes: notes?.trim() || null,
        appliedAt: appliedAt ? new Date(appliedAt) : new Date(),
      },
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Create application error:', error);
    return NextResponse.json({ error: '创建投递记录失败' }, { status: 500 });
  }
}
