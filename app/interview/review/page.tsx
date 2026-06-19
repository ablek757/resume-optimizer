'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import InterviewReviewReport from '@/components/interview-review-report';
import { InterviewReviewResult } from '@/lib/interview-review-prompt';

interface User {
  id: string;
  email: string;
}

const MAX_FILE_SIZE_MB = 3;
const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mp4',
  'audio/webm',
  'audio/x-m4a',
  'audio/m4a',
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function InterviewReviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<InterviewReviewResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [pendingTextReview, setPendingTextReview] = useState<{
    jobTitle: string;
    jobDescription: string;
    resume: string;
    messages: { role: 'assistant' | 'user'; content: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((err) => console.error('Fetch user error:', err))
      .finally(() => setLoadingUser(false));

    try {
      const pending = localStorage.getItem('resume_optimizer_interview_for_review');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (parsed.jobTitle && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setPendingTextReview(parsed);
          setJobTitle(parsed.jobTitle || '');
          setJobDescription(parsed.jobDescription || '');
          setResume(parsed.resume || '');
        }
        localStorage.removeItem('resume_optimizer_interview_for_review');
      }
    } catch (err) {
      console.error('Load pending review error:', err);
    }
  }, []);

  const handleFile = useCallback((selected: File) => {
    setError('');
    setReport(null);

    if (!ALLOWED_TYPES.includes(selected.type) && !selected.name.endsWith('.mp3')) {
      setError('不支持的音频格式，请上传 mp3/wav/m4a/webm');
      return;
    }

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`音频文件不能超过 ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFile(selected);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
    if (e.target) e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleTextReview = async () => {
    if (!pendingTextReview) return;
    if (!jobTitle.trim()) {
      setError('请输入目标岗位');
      return;
    }

    setError('');
    setReport(null);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/interview/review/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: pendingTextReview.messages,
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim() || undefined,
          resume: resume.trim() || undefined,
          language: 'zh',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(data.error || '请先登录');
        }
        throw new Error(data.error || '分析失败');
      }

      if (data.result) setReport(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('请先上传面试录音');
      return;
    }
    if (!jobTitle.trim()) {
      setError('请输入目标岗位');
      return;
    }

    setError('');
    setReport(null);
    setAnalyzing(true);

    try {
      const audioBase64 = await fileToBase64(file);
      const format = file.name.split('.').pop()?.toLowerCase() || 'wav';

      const res = await fetch('/api/interview/review/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          format,
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim() || undefined,
          resume: resume.trim() || undefined,
          language: 'zh',
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
        throw new Error(data.error || '分析失败');
      }

      if (data.result) setReport(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setAnalyzing(false);
    }
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
        <p className="mt-2 text-slate-600">登录后使用面试复盘分析</p>
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
            <h1 className="text-3xl font-bold text-slate-900">面试复盘分析</h1>
            <p className="mt-1 text-sm text-slate-600">
              上传真实面试录音，AI 帮你分析回答内容、表达和逻辑
            </p>
          </div>
          <Link
            href="/interview"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回面试模拟
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {pendingTextReview && (
            <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-sm text-slate-700">
                已加载刚刚的模拟面试记录，可以直接进行文字复盘。
              </p>
              <button
                type="button"
                onClick={handleTextReview}
                disabled={analyzing}
                className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {analyzing ? '分析中...' : '复盘本次模拟面试（免费）'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                上传面试录音 <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  onChange={onFileChange}
                  className="hidden"
                />
                <svg
                  className="mb-2 h-10 w-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-700">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · 点击重新上传
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">点击或拖拽上传录音</p>
                    <p className="mt-1 text-xs text-slate-500">
                      支持 mp3、wav、m4a、webm，最大 {MAX_FILE_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </div>
            </div>

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
              <label className="block text-sm font-medium text-slate-700">岗位 JD（可选）</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴招聘要求，复盘会更精准"
                rows={4}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">你的简历（可选）</label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="粘贴简历内容，AI 会结合你的经历做更精准的复盘"
                rows={6}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={!file || !jobTitle.trim() || analyzing}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-center text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                  AI 正在分析录音...
                </span>
              ) : (
                '开始复盘分析（消耗 1 次额度）'
              )}
            </button>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>

        {report && (
          <div className="mt-8">
            <InterviewReviewReport report={report} />
          </div>
        )}
      </div>
    </div>
  );
}
