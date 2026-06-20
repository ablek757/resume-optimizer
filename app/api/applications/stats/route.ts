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
    const weeksParam = Number(searchParams.get('weeks') || '4');
    const weeks = Math.min(12, Math.max(1, weeksParam));

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: { appliedAt: 'desc' },
    });

    const total = applications.length;
    const byStatus: Record<string, number> = {
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    const sourceBreakdown: Record<string, number> = {};

    for (const app of applications) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      const source = (app.source || '未填写').trim();
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    }

    const passedScreening = byStatus.screening + byStatus.interview + byStatus.offer + byStatus.rejected + byStatus.withdrawn;
    const interviewCount = byStatus.interview + byStatus.offer + byStatus.rejected + byStatus.withdrawn;
    const offerCount = byStatus.offer;

    const conversionRates = {
      appliedToScreening: total > 0 ? Math.round((passedScreening / total) * 100) : 0,
      appliedToInterview: total > 0 ? Math.round((interviewCount / total) * 100) : 0,
      interviewToOffer: interviewCount > 0 ? Math.round((offerCount / interviewCount) * 100) : 0,
      overall: total > 0 ? Math.round((offerCount / total) * 100) : 0,
    };

    // Weekly trend
    const now = new Date();
    const weeklyTrend = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const count = applications.filter(
        (a) => new Date(a.appliedAt) >= weekStart && new Date(a.appliedAt) <= weekEnd
      ).length;

      weeklyTrend.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        count,
      });
    }

    return NextResponse.json({
      total,
      byStatus,
      conversionRates,
      sourceBreakdown,
      weeklyTrend,
    });
  } catch (error) {
    console.error('Get application stats error:', error);
    return NextResponse.json({ error: '获取投递统计失败' }, { status: 500 });
  }
}
