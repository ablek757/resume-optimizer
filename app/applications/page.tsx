'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Calendar, MapPin, Banknote } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

interface JobApplication {
  id: string;
  company: string;
  position: string;
  jobTitle: string;
  jobDescription: string | null;
  source: string | null;
  status: string;
  salary: string | null;
  location: string | null;
  contact: string | null;
  notes: string | null;
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
  sourceBreakdown: Record<string, number>;
  weeklyTrend: { week: string; count: number }[];
}

const STATUS_CONFIG: {
  key: string;
  label: string;
  variant: BadgeProps['variant'];
}[] = [
  { key: 'applied', label: '已投递', variant: 'secondary' },
  { key: 'screening', label: '初筛中', variant: 'default' },
  { key: 'interview', label: '面试中', variant: 'warning' },
  { key: 'offer', label: '已 Offer', variant: 'success' },
  { key: 'rejected', label: '已拒绝', variant: 'destructive' },
  { key: 'withdrawn', label: '已撤回', variant: 'outline' },
];

const emptyApplication = {
  company: '',
  position: '',
  jobTitle: '',
  jobDescription: '',
  source: '',
  status: 'applied',
  salary: '',
  location: '',
  contact: '',
  notes: '',
  appliedAt: new Date().toISOString().split('T')[0],
};

export default function ApplicationsPage() {
  const { user, loading: userLoading } = useUser();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [form, setForm] = useState({ ...emptyApplication });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userLoading) {
      if (user) {
        fetchApplications();
        fetchStats();
      } else {
        setLoading(false);
      }
    }
  }, [user, userLoading]);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.applications) setApplications(data.applications);
    } catch (err) {
      console.error('Fetch applications error:', err);
    } finally {
      setLoading(false);
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

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyApplication });
    setModalOpen(true);
    setError('');
  };

  const openEdit = (app: JobApplication) => {
    setEditing(app);
    setForm({
      company: app.company,
      position: app.position,
      jobTitle: app.jobTitle,
      jobDescription: app.jobDescription || '',
      source: app.source || '',
      status: app.status,
      salary: app.salary || '',
      location: app.location || '',
      contact: app.contact || '',
      notes: app.notes || '',
      appliedAt: new Date(app.appliedAt).toISOString().split('T')[0],
    });
    setModalOpen(true);
    setError('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({ ...emptyApplication });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = editing ? `/api/applications/${editing.id}` : '/api/applications';
    const method = editing ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '保存失败');
      }

      await Promise.all([fetchApplications(), fetchStats()]);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条投递记录吗？')) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await Promise.all([fetchApplications(), fetchStats()]);
      }
    } catch (err) {
      console.error('Delete application error:', err);
    }
  };

  const updateStatus = async (app: JobApplication, status: string) => {
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await Promise.all([fetchApplications(), fetchStats()]);
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const filteredApplications = applications.filter(
    (app) =>
      app.company.toLowerCase().includes(search.toLowerCase()) ||
      app.position.toLowerCase().includes(search.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle>请先登录</CardTitle>
          <CardDescription>登录后使用投递追踪与数据看板</CardDescription>
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
        title="求职投递追踪"
        description="记录投递进度，把握求职节奏，分析转化率"
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增投递
        </Button>
      </PageHeader>

      {/* Stats dashboard */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总投递</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                近 7 天 {stats.weeklyTrend[stats.weeklyTrend.length - 1]?.count ?? 0} 条
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>面试转化率</CardDescription>
              <CardTitle className="text-3xl">{stats.conversionRates.appliedToInterview}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                投递 → 面试
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Offer 转化率</CardDescription>
              <CardTitle className="text-3xl">{stats.conversionRates.interviewToOffer}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                面试 → Offer
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>综合成功率</CardDescription>
              <CardTitle className="text-3xl">{stats.conversionRates.overall}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                投递 → Offer
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>周投递趋势</CardTitle>
              <CardDescription>最近 12 周投递量变化</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.weeklyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无数据</p>
              ) : (
                <div className="flex items-end gap-2">
                  {stats.weeklyTrend.map((w) => {
                    const max = Math.max(...stats.weeklyTrend.map((x) => x.count), 1);
                    const height = `${(w.count / max) * 100}%`;
                    return (
                      <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                          style={{ height: height || '4px', minHeight: w.count > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {w.week.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>来源分布</CardTitle>
              <CardDescription>按投递渠道统计</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(stats.sourceBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无数据</p>
              ) : (
                Object.entries(stats.sourceBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => {
                    const max = Math.max(...Object.values(stats.sourceBreakdown), 1);
                    return (
                      <div key={source}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-foreground">{source || '未知'}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-secondary-foreground transition-all"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索公司、职位、岗位"
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="sm:hidden">
          <Plus className="mr-1.5 h-4 w-4" />
          新增投递
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {STATUS_CONFIG.map((status) => {
          const items = filteredApplications.filter((a) => a.status === status.key);
          return (
            <Card key={status.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {items.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{app.company}</h3>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{app.position}</p>
                    <p className="mt-1 text-xs text-foreground">{app.jobTitle}</p>
                    {app.salary && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Banknote className="h-3 w-3" />
                        {app.salary}
                      </p>
                    )}
                    {app.location && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {app.location}
                      </p>
                    )}
                    {app.notes && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {app.notes}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(app.appliedAt)}
                      </span>
                      <Select
                        value={app.status}
                        onChange={(e) => updateStatus(app, e.target.value)}
                        className="h-7 w-24 text-[10px]"
                      >
                        {STATUS_CONFIG.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(app)}
                      className="mt-2 h-7 w-full text-xs"
                    >
                      编辑
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">暂无记录</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
          <DialogClose onClose={closeModal} />
          <DialogHeader>
            <DialogTitle>{editing ? '编辑投递' : '新增投递'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  公司 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  职位 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                目标岗位 <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">岗位 JD</label>
              <Textarea
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">状态</label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1"
                >
                  {STATUS_CONFIG.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium">投递日期</label>
                <Input
                  type="date"
                  value={form.appliedAt}
                  onChange={(e) => setForm({ ...form, appliedAt: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">薪资范围</label>
                <Input
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="20-30K"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">工作地点</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">投递渠道</label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="BOSS / 智联 / 官网"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">联系人</label>
                <Input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">备注</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                保存
              </Button>
              <Button type="button" variant="outline" onClick={closeModal}>
                取消
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
