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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <h1 className="text-2xl font-bold text-slate-900">请先登录</h1>
        <p className="mt-2 text-slate-600">登录后查看个人中心和历史记录</p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">个人中心</h1>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回首页
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/interview"
            className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100 transition-colors hover:bg-blue-100"
          >
            <p className="font-semibold text-blue-800">AI 面试模拟</p>
            <p className="mt-1 text-xs text-blue-600">基于简历和岗位实战演练</p>
          </Link>
          <Link
            href="/applications"
            className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-100 transition-colors hover:bg-green-100"
          >
            <p className="font-semibold text-green-800">投递追踪</p>
            <p className="mt-1 text-xs text-green-600">记录投递进度，把握求职节奏</p>
          </Link>
          <Link
            href="/interview/review"
            className="rounded-2xl bg-purple-50 p-5 ring-1 ring-purple-100 transition-colors hover:bg-purple-100"
          >
            <p className="font-semibold text-purple-800">面试复盘</p>
            <p className="mt-1 text-xs text-purple-600">上传录音，AI 分析面试表现</p>
          </Link>
          <Link
            href="/resumes"
            className="rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100 transition-colors hover:bg-indigo-100"
          >
            <p className="font-semibold text-indigo-800">简历版本</p>
            <p className="mt-1 text-xs text-indigo-600">管理多个岗位方向的简历</p>
          </Link>
          <Link
            href="/"
            className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
          >
            <p className="font-semibold text-slate-800">继续优化简历</p>
            <p className="mt-1 text-xs text-slate-600">上传简历，获取 AI 优化建议</p>
          </Link>
        </div>

        {/* User Info */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">我的账户</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">邮箱</p>
              <p className="mt-1 font-medium text-slate-900">{user.email}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">今日免费</p>
              <p className="mt-1 font-medium text-slate-900">
                {getRemainingFree()}/{FREE_DAILY_LIMIT} 次
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">剩余额度</p>
              <p className="mt-1 font-medium text-slate-900">{user.credits} 次</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">会员状态</p>
              <p className="mt-1 font-medium text-slate-900">
                {user.hasSubscription
                  ? `有效期至 ${new Date(user.subscriptionEndsAt!).toLocaleDateString('zh-CN')}`
                  : '未开通'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* History List */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">优化历史</h2>
              <div className="flex items-center gap-2">
                {compareMode && selectedIds.length === 2 && (
                  <button
                    onClick={startCompare}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    对比选中
                  </button>
                )}
                <button
                  onClick={() => {
                    setCompareMode((v) => !v);
                    setSelectedIds([]);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    compareMode
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {compareMode ? '退出对比' : '对比模式'}
                </button>
              </div>
            </div>

            {histories.length === 0 ? (
              <div className="rounded-xl bg-slate-50 py-12 text-center">
                <p className="text-slate-500">暂无优化记录</p>
                <Link
                  href="/"
                  className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700"
                >
                  去优化简历 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {histories.map((history) => (
                  <div
                    key={history.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      selectedHistory?.id === history.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {compareMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(history.id)}
                          onChange={() => toggleCompareSelection(history.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => !compareMode && setSelectedHistory(history)}
                      >
                        <h3 className="font-medium text-slate-900">
                          {history.jobTitle}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {history.originalText || '未填写原始简历'}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(history.createdAt)}
                        </p>
                      </div>
                      {!compareMode && (
                        <div className="flex flex-col items-end gap-2">
                          <Link
                            href="/interview"
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            模拟面试
                          </Link>
                          <button
                            onClick={() => deleteHistory(history.id)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">我的订单</h2>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">暂无订单</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">
                        {payment.packageName || '未知套餐'}
                      </span>
                      <span
                        className={`text-xs ${
                          payment.status === 'approved'
                            ? 'text-green-600'
                            : payment.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {payment.amount !== null ? `¥${payment.amount}` : '待确认'}
                    </p>
                    {payment.redemptionCode && (
                      <p className="mt-1 font-mono text-xs text-green-700">
                        兑换码：{payment.redemptionCode.code}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare Modal */}
      {comparePair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">历史版本对比</h3>
                <p className="text-xs text-slate-500">
                  仅对比「优化版简历」部分，绿色为新增，红色为删除
                </p>
              </div>
              <button
                onClick={closeCompare}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm font-medium text-slate-700">
                <div>
                  {comparePair[0].jobTitle}{' '}
                  <span className="text-xs text-slate-400">
                    {formatDate(comparePair[0].createdAt)}
                  </span>
                </div>
                <div>
                  {comparePair[1].jobTitle}{' '}
                  <span className="text-xs text-slate-400">
                    {formatDate(comparePair[1].createdAt)}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {diffLines.map((line, idx) => (
                      <tr
                        key={idx}
                        className={
                          line.type === 'add'
                            ? 'bg-green-50'
                            : line.type === 'remove'
                            ? 'bg-red-50'
                            : line.type === 'change'
                            ? 'bg-yellow-50'
                            : 'bg-white'
                        }
                      >
                        <td className="w-1/2 whitespace-pre-wrap border-r border-slate-100 px-3 py-1.5 text-slate-800">
                          {line.left ?? ''}
                        </td>
                        <td className="w-1/2 whitespace-pre-wrap px-3 py-1.5 text-slate-800">
                          {line.right ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedHistory.jobTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDate(selectedHistory.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistory(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              {copyMessage && (
                <p className="mb-3 text-sm text-green-600">{copyMessage}</p>
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleCopy(selectedHistory.result)}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  复制
                </button>
                <button
                  onClick={() => downloadMarkdown(selectedHistory.result, '简历优化结果')}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  Markdown
                </button>
                <button
                  onClick={handleExportWord}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  Word
                </button>
                <button
                  onClick={handleExportPDF}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  PDF
                </button>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-5">
                <MarkdownRenderer ref={resultRef} content={selectedHistory.result} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
