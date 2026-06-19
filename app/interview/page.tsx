'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InterviewChat, { ChatMessage } from '@/components/interview-chat';

interface User {
  id: string;
  email: string;
  credits: number;
  hasSubscription: boolean;
  dailyFreeUses: number;
}

interface HistoryItem {
  id: string;
  jobTitle: string;
  jobDescription: string | null;
  originalText: string;
}

const FREE_DAILY_LIMIT = 3;

export default function InterviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [language, setLanguage] = useState<'zh' | 'en' | 'bilingual'>('zh');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interviewing, setInterviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
    fetchHistories();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (err) {
      console.error('Fetch user error:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/history?limit=5');
      const data = await res.json();
      if (data.histories) setHistories(data.histories);
    } catch (err) {
      console.error('Fetch histories error:', err);
    }
  };

  const getRemainingFree = () => {
    if (!user) return FREE_DAILY_LIMIT;
    return Math.max(0, FREE_DAILY_LIMIT - user.dailyFreeUses);
  };

  const selectHistory = (h: HistoryItem) => {
    setJobTitle(h.jobTitle);
    setJobDescription(h.jobDescription || '');
    setResume(h.originalText);
  };

  const startInterview = async () => {
    setError('');
    setMessages([]);
    setInterviewing(true);
    setFinished(false);
    setLoading(true);

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          resume: resume.trim(),
          jobDescription: jobDescription.trim() || undefined,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(data.error || '请先登录');
        }
        if (res.status === 403) {
          throw new Error(
            data.error ||
              `今日免费次数已用完（${data.dailyFreeUses}/${data.dailyFreeLimit}），请购买额度或兑换会员`
          );
        }
        throw new Error(data.error || '开始面试失败');
      }

      setMessages([{ role: 'assistant', content: data.message }]);
      fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : '开始面试失败');
      setInterviewing(false);
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async (text: string) => {
    setError('');
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/interview/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          resume: resume.trim(),
          jobDescription: jobDescription.trim() || undefined,
          language,
          messages: updatedMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '继续面试失败');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);

      if (data.done) {
        setFinished(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '继续面试失败');
    } finally {
      setLoading(false);
    }
  };

  const resetInterview = () => {
    setMessages([]);
    setInterviewing(false);
    setFinished(false);
    setError('');
  };

  if (loadingUser) {
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
        <p className="mt-2 text-slate-600">登录后使用 AI 面试模拟</p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          返回首页登录
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">AI 面试模拟</h1>
            <p className="mt-1 text-sm text-slate-600">
              基于简历和岗位 JD，AI 面试官陪你实战演练
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回首页
          </Link>
        </div>

        {!interviewing ? (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                准备面试
              </h2>

              {histories.length > 0 && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700">
                    从历史记录快速选择
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {histories.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => selectHistory(h)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {h.jobTitle}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    目标岗位 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="例如：产品经理"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    岗位 JD（可选）
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="粘贴招聘要求，面试题会更精准"
                    rows={4}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    简历内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="粘贴你的简历内容"
                    rows={10}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {resume.length} / 8000 字
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    面试语言
                  </label>
                  <select
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value as 'zh' | 'en' | 'bilingual')
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                    <option value="bilingual">中英双语</option>
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
                  <div className="text-sm text-slate-700">
                    {user.hasSubscription ? (
                      <span className="font-medium text-green-600">会员有效期内可直接开始</span>
                    ) : (
                      <span>
                        今日免费 {getRemainingFree()}/{FREE_DAILY_LIMIT} 次
                        {user.credits > 0 && ` · 剩余额度 ${user.credits} 次`}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={startInterview}
                    disabled={
                      loading ||
                      !jobTitle.trim() ||
                      !resume.trim()
                    }
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? '准备中...' : '开始面试'}
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                岗位：<span className="font-medium text-slate-900">{jobTitle}</span>
              </div>
              {!finished && (
                <button
                  onClick={resetInterview}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  结束面试
                </button>
              )}
            </div>

            <InterviewChat
              messages={messages}
              loading={loading}
              finished={finished}
              onSend={sendAnswer}
              onFinish={resetInterview}
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
