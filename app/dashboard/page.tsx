'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Zap,
  MessageSquare,
  Briefcase,
  ChevronRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

interface HistoryItem {
  id: string;
  jobTitle: string;
  createdAt: string;
}

interface ApplicationItem {
  id: string;
  company: string;
  position: string;
  status: string;
  appliedAt: string;
}

interface StatsData {
  total: number;
  byStatus: Record<string, number>;
  conversionRates: {
    appliedToInterview: number;
    interviewToOffer: number;
    overall: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  applied: '已投递',
  screening: '初筛中',
  interview: '面试中',
  offer: '已 Offer',
  rejected: '已拒绝',
  withdrawn: '已撤回',
};

const quickActions = [
  { href: '/', label: '简历优化', desc: 'AI 按岗位优化简历', icon: FileText, color: 'bg-primary text-primary-foreground' },
  { href: '/diagnose', label: '快速诊断', desc: '60 秒定位简历问题', icon: Zap, color: 'bg-warning text-warning-foreground' },
  { href: '/interview', label: 'AI 面试', desc: '模拟真实面试场景', icon: MessageSquare, color: 'bg-success text-success-foreground' },
  { href: '/applications', label: '投递追踪', desc: '管理求职进度', icon: Briefcase, color: 'bg-secondary text-secondary-foreground' },
];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([fetchHistories(), fetchApplications(), fetchStats()]).finally(
      () => setLoading(false)
    );
  }, [user, userLoading]);

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.histories) setHistories(data.histories.slice(0, 5));
    } catch (err) {
      console.error('Fetch histories error:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.applications) setApplications(data.applications.slice(0, 5));
    } catch (err) {
      console.error('Fetch applications error:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/applications/stats');
      const data = await res.json();
      if (data.total !== undefined) setStats(data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle>请先登录</CardTitle>
          <CardDescription>登录后查看个人仪表盘</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button>返回首页登录</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="仪表盘"
        description={`欢迎回来，${user.email.split('@')[0]}`}
      >
        <Link href="/profile">
          <Button variant="outline">个人中心</Button>
        </Link>
      </PageHeader>

      {/* Quota */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>账户状态</CardDescription>
            <CardTitle className="text-2xl">
              {user.hasSubscription ? (
                <Badge variant="success">会员有效</Badge>
              ) : (
                <Badge variant="secondary">普通用户</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.hasSubscription && user.subscriptionEndsAt && (
              <p className="text-xs text-muted-foreground">
                有效期至 {new Date(user.subscriptionEndsAt).toLocaleDateString('zh-CN')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>剩余额度</CardDescription>
            <CardTitle className="text-3xl">{user.credits}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">积分</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>今日免费</CardDescription>
            <CardTitle className="text-3xl">{3 - (user.dailyFreeUses ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">剩余次数（共 3 次）</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已优化简历</CardDescription>
            <CardTitle className="text-3xl">{histories.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">近 5 条记录</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="group transition-colors hover:border-primary/30 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{action.label}</h3>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Delivery stats */}
      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总投递</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">累计投递记录</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>面试转化率</CardDescription>
              <CardTitle className="text-3xl">{stats.conversionRates.appliedToInterview}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">投递 → 面试</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Offer 转化率</CardDescription>
              <CardTitle className="text-3xl">{stats.conversionRates.interviewToOffer}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">面试 → Offer</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent history */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>最近优化</CardTitle>
                <CardDescription>最近生成的优化简历</CardDescription>
              </div>
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  查看全部
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {histories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">还没有优化记录</p>
                <Link href="/" className="mt-3">
                  <Button size="sm">去优化简历</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {histories.map((h) => (
                  <Link
                    key={h.id}
                    href={`/profile?history=${h.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium">{h.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {formatDate(h.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>最近投递</CardTitle>
                <CardDescription>最近的求职投递记录</CardDescription>
              </div>
              <Link href="/applications">
                <Button variant="ghost" size="sm">
                  查看全部
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">还没有投递记录</p>
                <Link href="/applications" className="mt-3">
                  <Button size="sm">去添加投递</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((a) => (
                  <Link
                    key={a.id}
                    href="/applications"
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {a.company} · {a.position}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {formatDate(a.appliedAt)}
                      </p>
                    </div>
                    <Badge variant={a.status === 'offer' ? 'success' : a.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {STATUS_LABELS[a.status] || a.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
