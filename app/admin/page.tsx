'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_PACKAGES } from '@/lib/payment';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/ui/toast';
import {
  Shield,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Receipt,
  KeyRound,
  Users,
  AlertCircle,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  credits: number;
  subscriptionEndsAt: string | null;
  dailyFreeUses: number;
  lastFreeUseDate: string | null;
  createdAt: string;
}

interface RedemptionCode {
  id: string;
  code: string;
  type: string;
  value: number;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface PaymentOrder {
  id: string;
  userId: string;
  userEmail: string;
  amount: number | null;
  packageName: string | null;
  packageType: string | null;
  packageValue: number | null;
  screenshot: string;
  recognizedText: string | null;
  status: string;
  redemptionCodeId: string | null;
  redemptionCode: { code: string; type: string; value: number } | null;
  notes: string | null;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalCodes: number;
  usedCodes: number;
  totalOptimizations: number;
}

type Tab = 'overview' | 'analytics' | 'payments' | 'codes' | 'users';

interface Analytics {
  today: {
    newUsers: number;
    optimizations: number;
    revenue: number;
  };
  totals: {
    users: number;
    optimizations: number;
    orders: number;
    revenue: number;
    pendingOrders: number;
  };
}

export default function AdminPage() {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [payments, setPayments] = useState<PaymentOrder[]>([]);

  const [codeType, setCodeType] = useState<'credits' | 'subscription_days'>('credits');
  const [codeValue, setCodeValue] = useState('10');
  const [codeCount, setCodeCount] = useState('1');
  const [codeExpiresDays, setCodeExpiresDays] = useState('');
  const [createdCodes, setCreatedCodes] = useState<string[] | null>(null);

  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [paymentActionLoading, setPaymentActionLoading] = useState<string | null>(null);

  const authHeader = `Bearer ${password}`;

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    setStats(data);
  };

  const fetchAnalytics = async () => {
    const res = await fetch('/api/admin/analytics', {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    setAnalytics(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    setUsers(data.users || []);
  };

  const fetchCodes = async () => {
    const res = await fetch('/api/admin/codes', {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    setCodes(data.codes || []);
  };

  const fetchPayments = async () => {
    const url = paymentFilter === 'all'
      ? '/api/admin/payments'
      : `/api/admin/payments?status=${paymentFilter}`;
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    setPayments(data.payments || []);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchAnalytics();
      fetchUsers();
      fetchCodes();
      fetchPayments();
    }
  }, [isAuthenticated]);

  const login = async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: authHeader },
      });

      if (!res.ok) {
        throw new Error('密码错误');
      }

      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments();
    }
  }, [paymentFilter, isAuthenticated]);

  const createCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedCodes(null);

    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          type: codeType,
          value: Number(codeValue),
          count: Number(codeCount),
          expiresInDays: codeExpiresDays ? Number(codeExpiresDays) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '创建失败');
      }

      setCreatedCodes(data.codes);
      fetchCodes();
    } catch (err) {
      toast(err instanceof Error ? err.message : '创建失败', 'error');
    }
  };

  const handlePaymentAction = async (
    orderId: string,
    action: 'approve' | 'reject',
    packageIndex?: number
  ) => {
    setPaymentActionLoading(orderId);

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          orderId,
          action,
          packageIndex,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '操作失败');
      }

      fetchPayments();
      fetchCodes();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setPaymentActionLoading(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge variant="success">已通过</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">已拒绝</Badge>;
    }
    return <Badge variant="warning">待审核</Badge>;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>管理后台</CardTitle>
            <CardDescription>请输入管理员密码</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="管理员密码"
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button onClick={login} className="w-full">
              进入后台
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="管理后台"
        description="管理用户、订单、兑换码及查看数据看板"
      >
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          <LogOut className="mr-2 h-4 w-4" />
          退出
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            数据看板
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="mr-2 h-4 w-4" />
            订单审核
          </TabsTrigger>
          <TabsTrigger value="codes">
            <KeyRound className="mr-2 h-4 w-4" />
            兑换码
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            用户
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总用户数</CardDescription>
                <CardTitle className="text-3xl">
                  {stats ? stats.totalUsers : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>兑换码总数</CardDescription>
                <CardTitle className="text-3xl">
                  {stats ? stats.totalCodes : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>已使用兑换码</CardDescription>
                <CardTitle className="text-3xl">
                  {stats ? stats.usedCodes : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总优化额度</CardDescription>
                <CardTitle className="text-3xl">
                  {stats ? stats.totalOptimizations : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>待审核订单</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">用户</th>
                      <th className="px-3 py-2">金额</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.filter((p) => p.status === 'pending').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          暂无待审核订单
                        </td>
                      </tr>
                    ) : (
                      payments
                        .filter((p) => p.status === 'pending')
                        .map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-3 py-2">{payment.userEmail}</td>
                            <td className="px-3 py-2">
                              {payment.amount !== null ? `¥${payment.amount}` : '-'}
                            </td>
                            <td className="px-3 py-2">{getStatusBadge(payment.status)}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatDate(payment.createdAt)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>今日新增用户</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? analytics.today.newUsers : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>今日优化次数</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? analytics.today.optimizations : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>今日收入</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? `¥${Math.round(analytics.today.revenue)}` : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>待审核订单</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? analytics.totals.pendingOrders : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总用户数</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? analytics.totals.users : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总优化次数</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? analytics.totals.optimizations : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总订单数</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? analytics.totals.orders : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>累计收入</CardDescription>
                <CardTitle className="text-3xl">
                  {analytics ? `¥${Math.round(analytics.totals.revenue)}` : <Skeleton className="h-9 w-20" />}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>订单管理</CardTitle>
              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="sm:w-40"
              >
                <option value="all">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </Select>
            </CardHeader>
            <CardContent className="space-y-4">
              {payments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">暂无订单</p>
              ) : (
                payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">用户：</span>
                            {payment.userEmail}
                          </p>
                          <p>
                            <span className="text-muted-foreground">金额：</span>
                            {payment.amount !== null ? `¥${payment.amount}` : '未识别'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">套餐：</span>
                            {payment.packageName || '-'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">状态：</span>
                            {getStatusBadge(payment.status)}
                          </p>
                          {payment.redemptionCode && (
                            <p>
                              <span className="text-muted-foreground">发放码：</span>
                              <span className="font-mono text-success">
                                {payment.redemptionCode.code}
                              </span>
                            </p>
                          )}
                          {payment.recognizedText && (
                            <p className="max-w-xl text-xs text-muted-foreground">
                              <span className="text-muted-foreground/70">识别内容：</span>
                              {payment.recognizedText}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground">
                              <span className="text-muted-foreground/70">备注：</span>
                              {payment.notes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70">
                            {formatDate(payment.createdAt)}
                          </p>
                        </div>

                        {payment.status === 'pending' && (
                          <div className="flex flex-col gap-2 sm:min-w-[160px]">
                            <Select
                              id={`pkg-${payment.id}`}
                              defaultValue=""
                            >
                              <option value="" disabled>选择套餐</option>
                              {DEFAULT_PACKAGES.map((pkg, idx) => (
                                <option key={idx} value={idx}>
                                  {pkg.name} · ¥{pkg.price}
                                </option>
                              ))}
                            </Select>
                            <Button
                              onClick={() => {
                                const select = document.getElementById(
                                  `pkg-${payment.id}`
                                ) as HTMLSelectElement;
                                const idx = Number(select.value);
                                if (isNaN(idx)) {
                                  toast('请选择套餐', 'error');
                                  return;
                                }
                                handlePaymentAction(payment.id, 'approve', idx);
                              }}
                              disabled={paymentActionLoading === payment.id}
                            >
                              {paymentActionLoading === payment.id ? '处理中...' : '通过并发卡'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handlePaymentAction(payment.id, 'reject')}
                              disabled={paymentActionLoading === payment.id}
                            >
                              拒绝
                            </Button>
                          </div>
                        )}
                      </div>

                      {payment.screenshot && (
                        <div className="mt-3">
                          <img
                            src={`data:image/png;base64,${payment.screenshot}`}
                            alt="付款截图"
                            className="max-h-64 rounded-lg border border-border object-contain"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>创建兑换码</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createCodes} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">类型</label>
                    <Select
                      value={codeType}
                      onChange={(e) => setCodeType(e.target.value as 'credits' | 'subscription_days')}
                    >
                      <option value="credits">优化次数额度</option>
                      <option value="subscription_days">会员天数</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">数值</label>
                    <Input
                      type="number"
                      min="1"
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {codeType === 'credits' ? '可优化次数' : '会员天数'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">数量</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={codeCount}
                      onChange={(e) => setCodeCount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">有效期（天，可选）</label>
                    <Input
                      type="number"
                      min="1"
                      value={codeExpiresDays}
                      onChange={(e) => setCodeExpiresDays(e.target.value)}
                      placeholder="不填则永久有效"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    创建兑换码
                  </Button>
                </form>

                {createdCodes && (
                  <div className="mt-4 rounded-lg bg-success/10 p-4">
                    <p className="mb-2 text-sm font-medium text-success">
                      创建成功：
                    </p>
                    <div className="space-y-1">
                      {createdCodes.map((code) => (
                        <div
                          key={code}
                          className="select-all font-mono text-sm text-success"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>兑换码列表</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">兑换码</th>
                        <th className="px-3 py-2">类型</th>
                        <th className="px-3 py-2">数值</th>
                        <th className="px-3 py-2">状态</th>
                        <th className="px-3 py-2">创建时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {codes.map((code) => (
                        <tr key={code.id}>
                          <td className="px-3 py-2 font-mono">{code.code}</td>
                          <td className="px-3 py-2">
                            {code.type === 'credits' ? '次数' : '会员'}
                          </td>
                          <td className="px-3 py-2">{code.value}</td>
                          <td className="px-3 py-2">
                            {code.usedBy ? (
                              <Badge variant="secondary">已使用</Badge>
                            ) : code.expiresAt && new Date(code.expiresAt) < new Date() ? (
                              <Badge variant="destructive">已过期</Badge>
                            ) : (
                              <Badge variant="success">未使用</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(code.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用户列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">邮箱</th>
                      <th className="px-3 py-2">额度</th>
                      <th className="px-3 py-2">会员到期</th>
                      <th className="px-3 py-2">今日免费</th>
                      <th className="px-3 py-2">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-3 py-2">{user.email}</td>
                        <td className="px-3 py-2">{user.credits}</td>
                        <td className="px-3 py-2">
                          {user.subscriptionEndsAt ? (
                            new Date(user.subscriptionEndsAt) > new Date() ? (
                              <Badge variant="success">
                                {formatDate(user.subscriptionEndsAt)}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">已过期</Badge>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {user.lastFreeUseDate === new Date().toISOString().split('T')[0]
                            ? `${user.dailyFreeUses}/3`
                            : '0/3'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
