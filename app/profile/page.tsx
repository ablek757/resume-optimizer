'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import MarkdownRenderer from '@/components/markdown-renderer';
import {
  copyToClipboard,
  downloadMarkdown,
  exportToWord,
  exportToPDF,
} from '@/lib/export';
import { extractOptimizedResume } from '@/lib/extract-resume';
import { computeLineDiff, DiffLine } from '@/lib/diff';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  History,
  CreditCard,
  Briefcase,
  MessageSquare,
  FileText,
  Home,
  Sparkles,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  credits: number;
  subscriptionEndsAt: string | null;
  hasSubscription: boolean;
  dailyFreeUses: number;
}

interface HistoryItem {
  id: string;
  jobTitle: string;
  jobDescription: string | null;
  originalText: string;
  result: string;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  amount: number | null;
  packageName: string | null;
  status: string;
  redemptionCode: { code: string } | null;
  createdAt: string;
}

const FREE_DAILY_LIMIT = 3;

const quickActions = [
  {
    href: '/interview',
    title: 'AI 面试模拟',
    description: '基于简历和岗位实战演练',
    icon: MessageSquare,
  },
  {
    href: '/applications',
    title: '投递追踪',
    description: '记录投递进度，把握求职节奏',
    icon: Briefcase,
  },
  {
    href: '/interview/review',
    title: '面试复盘',
    description: '上传录音，AI 分析面试表现',
    icon: FileText,
  },
  {
    href: '/resumes',
    title: '简历版本',
    description: '管理多个岗位方向的简历',
    icon: History,
  },
  {
    href: '/',
    title: '继续优化简历',
    description: '上传简历，获取 AI 优化建议',
    icon: Sparkles,
  },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparePair, setComparePair] = useState<[HistoryItem, HistoryItem] | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  useEffect(() => {
    fetchUser();
    fetchHistories();
    fetchPayments();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (err) {
      console.error('Fetch user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.histories) setHistories(data.histories);
    } catch (err) {
      console.error('Fetch histories error:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/user/payments');
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch (err) {
      console.error('Fetch payments error:', err);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm('确定删除这条历史记录吗？')) return;

    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistories((prev) => prev.filter((h) => h.id !== id));
        if (selectedHistory?.id === id) setSelectedHistory(null);
      }
    } catch (err) {
      console.error('Delete history error:', err);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text);
      setCopyMessage('已复制');
      setTimeout(() => setCopyMessage(''), 1500);
    } catch {
      setCopyMessage('复制失败');
    }
  };

  const handleExportWord = async () => {
    if (!resultRef.current) return;
    await exportToWord(resultRef.current.innerHTML, '简历优化结果');
  };

  const handleExportPDF = async () => {
    if (!resultRef.current) return;
    await exportToPDF(resultRef.current, '简历优化结果');
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const startCompare = () => {
    if (selectedIds.length !== 2) return;
    const pair = histories.filter((h) => selectedIds.includes(h.id)) as [HistoryItem, HistoryItem];
    if (pair.length !== 2) return;
    setComparePair(pair);
    const left = extractOptimizedResume(pair[0].result);
    const right = extractOptimizedResume(pair[1].result);
    setDiffLines(computeLineDiff(left, right));
  };

  const closeCompare = () => {
    setComparePair(null);
    setDiffLines([]);
    setSelectedIds([]);
    setCompareMode(false);
  };

  const getRemainingFree = () => {
    if (!user) return FREE_DAILY_LIMIT;
    return Math.max(0, FREE_DAILY_LIMIT - user.dailyFreeUses);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const getStatusText = (status: string) => {
    if (status === 'approved') return '已通过';
    if (status === 'rejected') return '已拒绝';
    return '待审核';
  };

  const getStatusVariant = (status: string): React.ComponentProps<typeof Badge>['variant'] => {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'destructive';
    return 'warning';
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-40" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>登录后查看个人中心和历史记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">返回首页登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="个人中心"
        description="管理账户信息、查看优化历史与订单"
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <Home className="h-4 w-4" />
            返回首页
          </Link>
        </Button>
      </PageHeader>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="block">
            <Card className="h-full transition-colors hover:bg-accent">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 font-semibold text-foreground">{action.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            我的账户
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">邮箱</p>
              <p className="mt-1 font-medium text-foreground">{user.email}</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">今日免费</p>
              <p className="mt-1 font-medium text-foreground">
                {getRemainingFree()}/{FREE_DAILY_LIMIT} 次
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">剩余额度</p>
              <p className="mt-1 font-medium text-foreground">{user.credits} 次</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">会员状态</p>
              <p className="mt-1 font-medium text-foreground">
                {user.hasSubscription
                  ? `有效期至 ${new Date(user.subscriptionEndsAt!).toLocaleDateString('zh-CN')}`
                  : '未开通'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* History List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              优化历史
            </CardTitle>
            <div className="flex items-center gap-2">
              {compareMode && selectedIds.length === 2 && (
                <Button size="sm" onClick={startCompare}>
                  对比选中
                </Button>
              )}
              <Button
                size="sm"
                variant={compareMode ? 'secondary' : 'outline'}
                onClick={() => {
                  setCompareMode((v) => !v);
                  setSelectedIds([]);
                }}
              >
                {compareMode ? '退出对比' : '对比模式'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {histories.length === 0 ? (
              <div className="rounded-lg bg-muted py-12 text-center">
                <p className="text-muted-foreground">暂无优化记录</p>
                <Button asChild variant="link" size="sm" className="mt-2">
                  <Link href="/">去优化简历 →</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {histories.map((history) => (
                  <Card
                    key={history.id}
                    className={`transition-colors ${
                      selectedHistory?.id === history.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {compareMode && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(history.id)}
                            onChange={() => toggleCompareSelection(history.id)}
                            className="mt-1 h-4 w-4 rounded border-border text-primary accent-primary focus:ring-ring"
                          />
                        )}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => !compareMode && setSelectedHistory(history)}
                        >
                          <h3 className="font-medium text-foreground">{history.jobTitle}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {history.originalText || '未填写原始简历'}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatDate(history.createdAt)}
                          </p>
                        </div>
                        {!compareMode && (
                          <div className="flex flex-col items-end gap-1">
                            <Button asChild variant="link" size="sm" className="h-auto p-0">
                              <Link href="/interview">模拟面试</Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteHistory(history.id)}
                            >
                              删除
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              我的订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无订单</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {payment.packageName || '未知套餐'}
                      </span>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {getStatusText(payment.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {payment.amount !== null ? `¥${payment.amount}` : '待确认'}
                    </p>
                    {payment.redemptionCode && (
                      <p className="mt-1 font-mono text-xs text-success">
                        兑换码：{payment.redemptionCode.code}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compare Modal */}
      {comparePair && (
        <Dialog open={true} onOpenChange={(open) => !open && closeCompare()}>
          <DialogContent>
            <DialogClose onClose={closeCompare} />
            <DialogHeader>
              <DialogTitle>历史版本对比</DialogTitle>
              <DialogDescription>
                仅对比「优化版简历」部分，绿色为新增，红色为删除
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm font-medium text-foreground">
                <div>
                  {comparePair[0].jobTitle}{' '}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comparePair[0].createdAt)}
                  </span>
                </div>
                <div>
                  {comparePair[1].jobTitle}{' '}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comparePair[1].createdAt)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {diffLines.map((line, idx) => (
                      <tr
                        key={idx}
                        className={
                          line.type === 'add'
                            ? 'bg-success/10'
                            : line.type === 'remove'
                            ? 'bg-destructive/10'
                            : line.type === 'change'
                            ? 'bg-warning/10'
                            : 'bg-background'
                        }
                      >
                        <td className="w-1/2 whitespace-pre-wrap border-r border-border px-3 py-1.5 text-foreground">
                          {line.left ?? ''}
                        </td>
                        <td className="w-1/2 whitespace-pre-wrap px-3 py-1.5 text-foreground">
                          {line.right ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* History Detail Modal */}
      {selectedHistory && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && setSelectedHistory(null)}
        >
          <DialogContent>
            <DialogClose onClose={() => setSelectedHistory(null)} />
            <DialogHeader>
              <DialogTitle>{selectedHistory.jobTitle}</DialogTitle>
              <DialogDescription>{formatDate(selectedHistory.createdAt)}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              {copyMessage && (
                <p className="mb-3 text-sm font-medium text-success">{copyMessage}</p>
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(selectedHistory!.result)}
                >
                  复制
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadMarkdown(selectedHistory!.result, '简历优化结果')}
                >
                  Markdown
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportWord}>
                  Word
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportPDF}>
                  PDF
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-muted p-5">
                <MarkdownRenderer ref={resultRef} content={selectedHistory!.result} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
