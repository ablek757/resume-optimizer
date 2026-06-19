'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_PACKAGES } from '@/lib/payment';

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

type Tab = 'overview' | 'payments' | 'codes' | 'users';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
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

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    setStats(data);
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
      alert(err instanceof Error ? err.message : '创建失败');
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
      alert(err instanceof Error ? err.message : '操作失败');
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
      return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">已通过</span>;
    }
    if (status === 'rejected') {
      return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">已拒绝</span>;
    }
    return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">待审核</span>;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">管理后台</h1>
          <p className="mb-6 text-sm text-slate-600">请输入管理员密码</p>

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="管理员密码"
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={login}
              className="w-full rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              进入后台
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">管理后台</h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            退出
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {[
            { key: 'overview', label: '概览' },
            { key: 'payments', label: '订单审核' },
            { key: 'codes', label: '兑换码' },
            { key: 'users', label: '用户' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">总用户数</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {stats?.totalUsers ?? '-'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">兑换码总数</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {stats?.totalCodes ?? '-'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">已使用兑换码</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {stats?.usedCodes ?? '-'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">总优化额度</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {stats?.totalOptimizations ?? '-'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                待审核订单
              </h2>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2">用户</th>
                      <th className="px-3 py-2">金额</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.filter((p) => p.status === 'pending').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
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
                            <td className="px-3 py-2 text-slate-500">
                              {formatDate(payment.createdAt)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Payments */}
        {activeTab === 'payments' && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">订单管理</h2>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>

            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="py-8 text-center text-slate-500">暂无订单</p>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-slate-500">用户：</span>
                          {payment.userEmail}
                        </p>
                        <p>
                          <span className="text-slate-500">金额：</span>
                          {payment.amount !== null ? `¥${payment.amount}` : '未识别'}
                        </p>
                        <p>
                          <span className="text-slate-500">套餐：</span>
                          {payment.packageName || '-'}
                        </p>
                        <p>
                          <span className="text-slate-500">状态：</span>
                          {getStatusBadge(payment.status)}
                        </p>
                        {payment.redemptionCode && (
                          <p>
                            <span className="text-slate-500">发放码：</span>
                            <span className="font-mono text-green-700">
                              {payment.redemptionCode.code}
                            </span>
                          </p>
                        )}
                        {payment.recognizedText && (
                          <p className="max-w-xl text-xs text-slate-500">
                            <span className="text-slate-400">识别内容：</span>
                            {payment.recognizedText}
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-slate-500">
                            <span className="text-slate-400">备注：</span>
                            {payment.notes}
                          </p>
                        )}
                        <p className="text-xs text-slate-400">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>

                      {payment.status === 'pending' && (
                        <div className="flex flex-col gap-2 sm:min-w-[160px]">
                          <select
                            id={`pkg-${payment.id}`}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                            defaultValue=""
                          >
                            <option value="" disabled>选择套餐</option>
                            {DEFAULT_PACKAGES.map((pkg, idx) => (
                              <option key={idx} value={idx}>
                                {pkg.name} · ¥{pkg.price}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const select = document.getElementById(
                                `pkg-${payment.id}`
                              ) as HTMLSelectElement;
                              const idx = Number(select.value);
                              if (isNaN(idx)) {
                                alert('请选择套餐');
                                return;
                              }
                              handlePaymentAction(payment.id, 'approve', idx);
                            }}
                            disabled={paymentActionLoading === payment.id}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
                          >
                            {paymentActionLoading === payment.id ? '处理中...' : '通过并发卡'}
                          </button>
                          <button
                            onClick={() => handlePaymentAction(payment.id, 'reject')}
                            disabled={paymentActionLoading === payment.id}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </div>

                    {payment.screenshot && (
                      <div className="mt-3">
                        <img
                          src={`data:image/png;base64,${payment.screenshot}`}
                          alt="付款截图"
                          className="max-h-64 rounded-lg border border-slate-200 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Codes */}
        {activeTab === 'codes' && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-1">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                创建兑换码
              </h2>
              <form onSubmit={createCodes} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    类型
                  </label>
                  <select
                    value={codeType}
                    onChange={(e) => setCodeType(e.target.value as 'credits' | 'subscription_days')}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="credits">优化次数额度</option>
                    <option value="subscription_days">会员天数</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    数值
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={codeValue}
                    onChange={(e) => setCodeValue(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {codeType === 'credits' ? '可优化次数' : '会员天数'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={codeCount}
                    onChange={(e) => setCodeCount(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    有效期（天，可选）
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={codeExpiresDays}
                    onChange={(e) => setCodeExpiresDays(e.target.value)}
                    placeholder="不填则永久有效"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                >
                  创建兑换码
                </button>
              </form>

              {createdCodes && (
                <div className="mt-4 rounded-lg bg-green-50 p-4">
                  <p className="mb-2 text-sm font-medium text-green-800">
                    创建成功：
                  </p>
                  <div className="space-y-1">
                    {createdCodes.map((code) => (
                      <div
                        key={code}
                        className="select-all font-mono text-sm text-green-700"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                兑换码列表
              </h2>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2">兑换码</th>
                      <th className="px-3 py-2">类型</th>
                      <th className="px-3 py-2">数值</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">创建时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {codes.map((code) => (
                      <tr key={code.id}>
                        <td className="px-3 py-2 font-mono">{code.code}</td>
                        <td className="px-3 py-2">
                          {code.type === 'credits' ? '次数' : '会员'}
                        </td>
                        <td className="px-3 py-2">{code.value}</td>
                        <td className="px-3 py-2">
                          {code.usedBy ? (
                            <span className="text-slate-400">已使用</span>
                          ) : code.expiresAt && new Date(code.expiresAt) < new Date() ? (
                            <span className="text-red-500">已过期</span>
                          ) : (
                            <span className="text-green-600">未使用</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {formatDate(code.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              用户列表
            </h2>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">邮箱</th>
                    <th className="px-3 py-2">额度</th>
                    <th className="px-3 py-2">会员到期</th>
                    <th className="px-3 py-2">今日免费</th>
                    <th className="px-3 py-2">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2">{user.credits}</td>
                      <td className="px-3 py-2">
                        {user.subscriptionEndsAt ? (
                          new Date(user.subscriptionEndsAt) > new Date() ? (
                            <span className="text-green-600">
                              {formatDate(user.subscriptionEndsAt)}
                            </span>
                          ) : (
                            <span className="text-slate-400">已过期</span>
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
                      <td className="px-3 py-2 text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
