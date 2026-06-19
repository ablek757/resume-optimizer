'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import MarkdownRenderer from '@/components/markdown-renderer';
import AuthModal from '@/components/auth-modal';
import ResumeTemplate, { ResumeTemplateType } from '@/components/resume-template';
import Onboarding, { useOnboarding } from '@/components/onboarding';
import { Package, DEFAULT_PACKAGES } from '@/lib/payment';
import {
  copyToClipboard,
  downloadMarkdown,
  exportToWord,
  exportToPDF,
  exportResumeToMarkdown,
  exportResumeToWord,
  exportResumeToPDF,
} from '@/lib/export';
import { extractOptimizedResume } from '@/lib/extract-resume';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import Steps from '@/components/landing/steps';
import Pricing from '@/components/landing/pricing';
import FAQ from '@/components/landing/faq';
import CTA from '@/components/landing/cta';

interface User {
  id: string;
  email: string;
  credits: number;
  subscriptionEndsAt: string | null;
  hasSubscription: boolean;
  dailyFreeUses: number;
}

interface ScoreResult {
  score: number;
  matchPercentage: number;
  summary: string;
  keywords: { word: string; matched: boolean; suggestion?: string }[];
  suggestions: string[];
}

interface OptimizeResponse {
  result?: string;
  error?: string;
  code?: string;
  dailyFreeLimit?: number;
  dailyFreeUses?: number;
  credits?: number;
  hasSubscription?: boolean;
}

const FREE_DAILY_LIMIT = 3;
const DRAFT_KEY = 'resume_optimizer_draft';

function loadDraftValue(key: 'jobTitle' | 'jobDescription' | 'resume'): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return '';
    const draft = JSON.parse(raw);
    return typeof draft[key] === 'string' ? draft[key] : '';
  } catch {
    return '';
  }
}

export default function Home() {
  const [jobTitle, setJobTitle] = useState(() => loadDraftValue('jobTitle'));
  const [jobDescription, setJobDescription] = useState(() => loadDraftValue('jobDescription'));
  const [resume, setResume] = useState(() => loadDraftValue('resume'));
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [score, setScore] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);

  const [language, setLanguage] = useState<'zh' | 'en' | 'bilingual'>('zh');
  const [resultTab, setResultTab] = useState<'report' | 'resume'>('report');
  const [editedResume, setEditedResume] = useState('');
  const [resumeTemplate, setResumeTemplate] = useState<ResumeTemplateType>('classic');
  const resumePreviewRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMessage, setRedeemMessage] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment flow states
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [paymentScreenshotName, setPaymentScreenshotName] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Export and scroll refs
  const editorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [copyMessage, setCopyMessage] = useState('');

  // Abort controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  const { show: showOnboarding, close: closeOnboarding } = useOnboarding();

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (err) {
      console.error('Fetch user error:', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Auto save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            jobTitle,
            jobDescription,
            resume,
          })
        );
      } catch (err) {
        console.error('Save draft error:', err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [jobTitle, jobDescription, resume]);

  // Extract editable resume section when result arrives
  useEffect(() => {
    const extracted = extractOptimizedResume(result);
    setEditedResume(extracted);
    if (extracted) {
      setResultTab('resume');
    }
  }, [result]);

  const scrollToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemMessage('');

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRedeemMessage(data.error || '兑换失败');
      } else {
        setRedeemMessage(data.message);
        setRedeemCode('');
        fetchUser();
      }
    } catch (err) {
      setRedeemMessage('兑换失败，请重试');
    }
  };

  const getRemainingFree = () => {
    if (!user) return FREE_DAILY_LIMIT;
    return Math.max(0, FREE_DAILY_LIMIT - user.dailyFreeUses);
  };

  const handleSelectPackage = async (pkg: Package, index: number) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setSelectedPackage(pkg);
    setPaymentOrderId(null);
    setPaymentCode('');
    setPaymentError('');
    setPaymentSuccess(false);
    setPaymentScreenshotName('');
    setPaymentLoading(true);

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIndex: index }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '创建订单失败');
      }

      setPaymentOrderId(data.orderId);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : '创建订单失败');
      setSelectedPackage(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleScreenshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !paymentOrderId) return;

    setPaymentLoading(true);
    setPaymentError('');
    setPaymentCode('');
    setPaymentSuccess(false);
    setPaymentScreenshotName(file.name);

    const formData = new FormData();
    formData.append('orderId', paymentOrderId);
    formData.append('screenshot', file);

    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '验证失败');
      }

      setPaymentCode(data.code);
      setPaymentSuccess(true);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setPaymentLoading(false);
    }

    if (e.target) e.target.value = '';
  };

  const handleRedeemPaymentCode = async () => {
    if (!paymentCode) return;
    setRedeemCode(paymentCode);

    setRedeemMessage('');
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: paymentCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRedeemMessage(data.error || '兑换失败');
      } else {
        setRedeemMessage(data.message);
        setPaymentCode('');
        setSelectedPackage(null);
        setPaymentOrderId(null);
        setPaymentSuccess(false);
        fetchUser();
      }
    } catch (err) {
      setRedeemMessage('兑换失败，请重试');
    }
  };

  const resetPayment = () => {
    setSelectedPackage(null);
    setPaymentOrderId(null);
    setPaymentCode('');
    setPaymentError('');
    setPaymentSuccess(false);
    setPaymentScreenshotName('');
  };

  const clearDraft = () => {
    setJobTitle('');
    setJobDescription('');
    setResume('');
    setUploadedFileName('');
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error('Clear draft error:', err);
    }
  };

  const fetchScore = async () => {
    setScoring(true);
    setScore(null);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          resume: resume.trim(),
          jobDescription: jobDescription.trim() || undefined,
          language,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Score error:', data.error);
        return;
      }

      const data = await res.json();
      if (data.score) setScore(data.score);
    } catch (err) {
      console.error('Fetch score error:', err);
    } finally {
      setScoring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult('');
    setScore(null);
    setLoading(true);

    // Start scoring in parallel (does not block the stream)
    fetchScore();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          resume: resume.trim(),
          jobDescription: jobDescription.trim() || undefined,
          language,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const data: OptimizeResponse = await res.json();
        if (res.status === 401) {
          setAuthModalOpen(true);
          throw new Error(data.error || '请先登录');
        }
        if (res.status === 403) {
          throw new Error(
            data.error ||
              `今日免费次数已用完（${data.dailyFreeUses}/${data.dailyFreeLimit}），请购买额度或兑换会员`
          );
        }
        throw new Error(data.error || '请求失败');
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let done = false;
      let fullResult = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullResult += chunk;
          setResult(fullResult);
        }
      }

      // Optimization completed: clear draft and refresh user info
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {
        console.error('Clear draft after success error:', err);
      }
      fetchUser();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User manually stopped generation
      } else {
        setError(err instanceof Error ? err.message : '发生未知错误');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '提取失败');
      }

      if (data.text) {
        setResume(data.text);
      } else {
        throw new Error('未能提取到文字');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '提取失败');
      setUploadedFileName('');
    } finally {
      setUploading(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const fillExample = () => {
    setJobTitle('产品经理');
    setJobDescription('');
    setResume(
      `张三
138-xxxx-xxxx | zhangsan@email.com | 北京

教育背景
2018-2022 北京大学 计算机科学与技术 本科

工作经历
2022-至今 某互联网公司 产品专员
- 负责 App 功能迭代
- 与技术、设计、运营沟通需求
- 写产品文档，组织评审会

技能
- Axure、Figma、SQL
- 数据分析、用户调研`
    );
    setUploadedFileName('');
  };

  // Export handlers
  const handleCopy = async () => {
    if (!result) return;
    try {
      await copyToClipboard(result);
      setCopyMessage('已复制到剪贴板');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch {
      setCopyMessage('复制失败');
    }
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    downloadMarkdown(result, '简历优化结果');
  };

  const handleExportWord = async () => {
    if (!resultRef.current) return;
    const html = resultRef.current.innerHTML;
    await exportToWord(html, '简历优化结果');
  };

  const handleExportPDF = async () => {
    if (!resultRef.current) return;
    await exportToPDF(resultRef.current, '简历优化结果');
  };

  const handleResumeCopy = async () => {
    if (!editedResume) return;
    try {
      await copyToClipboard(editedResume);
      setCopyMessage('已复制优化版简历');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch {
      setCopyMessage('复制失败');
    }
  };

  const handleResumeExportMarkdown = () => {
    if (!editedResume) return;
    exportResumeToMarkdown(editedResume, '优化版简历');
  };

  const handleResumeExportWord = async () => {
    if (!resumePreviewRef.current) return;
    await exportResumeToWord(resumePreviewRef.current.innerHTML, '优化版简历');
  };

  const handleResumeExportPDF = async () => {
    if (!resumePreviewRef.current) return;
    await exportResumeToPDF(resumePreviewRef.current, '优化版简历');
  };

  const resetEditedResume = () => {
    setEditedResume(extractOptimizedResume(result));
  };

  return (
    <div className="min-h-screen bg-white">
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={() => fetchUser()}
      />

      {showOnboarding && (
        <Onboarding
          onStartDemo={() => {
            fillExample();
            scrollToEditor();
            closeOnboarding();
          }}
          onClose={closeOnboarding}
        />
      )}

      {/* Landing Page */}
      <Hero onStart={scrollToEditor} />
      <Features />
      <Steps />
      <Pricing onStart={scrollToEditor} />
      <FAQ />
      <CTA onStart={scrollToEditor} />

      {/* Editor Section */}
      <div ref={editorRef} className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header + User Bar */}
          <div className="mb-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  AI 简历优化
                </h2>
                <p className="mt-2 text-base text-slate-600">
                  上传简历 PDF/图片，或粘贴文字，AI 帮你生成优化版简历和面试建议
                </p>
              </div>

              <div className="flex items-center gap-3">
                {user ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm text-slate-700">{user.email}</div>
                    <div className="text-xs text-slate-500">
                      {user.hasSubscription ? (
                        <span className="font-medium text-green-600">会员有效期内无限次</span>
                      ) : (
                        <span>
                          今日免费 {getRemainingFree()}/{FREE_DAILY_LIMIT} 次
                          {user.credits > 0 && ` · 额度 ${user.credits} 次`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/interview"
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        面试模拟
                      </Link>
                      <Link
                        href="/applications"
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        投递追踪
                      </Link>
                      <Link
                        href="/profile"
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        个人中心
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    登录 / 注册
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Form */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="jobTitle"
                    className="block text-sm font-medium text-slate-700"
                  >
                    目标岗位 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="例如：产品经理、Java 后端开发、新媒体运营"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-slate-700"
                  >
                    输出语言
                  </label>
                  <select
                    id="language"
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

                <div>
                  <label
                    htmlFor="jobDescription"
                    className="block text-sm font-medium text-slate-700"
                  >
                    岗位 JD（可选）
                  </label>
                  <textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="粘贴招聘要求，优化会更精准"
                    rows={4}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    上传简历（PDF / 图片）
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
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,application/pdf,image/*"
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
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    {uploading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
                        正在提取文字，请稍候...
                      </div>
                    ) : uploadedFileName ? (
                      <div className="text-center">
                        <p className="text-sm font-medium text-blue-700">
                          已上传：{uploadedFileName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          文字已填入下方输入框，点击可重新上传
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">
                          点击或拖拽上传简历
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          支持 PDF、PNG、JPG、WebP，最大 5MB
                        </p>
                      </div>
                    )}
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="resume"
                    className="block text-sm font-medium text-slate-700"
                  >
                    简历内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="resume"
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="粘贴你的简历内容，或上传 PDF/图片自动提取"
                    rows={12}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {resume.length} / 8000 字
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={loading || !jobTitle.trim() || !resume.trim()}
                    className="flex-1 rounded-lg bg-blue-600 px-5 py-3 text-center text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {loading ? '优化中，请稍候...' : '开始优化'}
                  </button>
                  <button
                    type="button"
                    onClick={fillExample}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-base font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  >
                    填入示例
                  </button>
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-base font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  >
                    清空草稿
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Result */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">优化结果</h2>
                  {result && !loading && (
                    <div className="flex rounded-lg bg-slate-100 p-0.5">
                      <button
                        onClick={() => setResultTab('report')}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          resultTab === 'report'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        完整报告
                      </button>
                      <button
                        onClick={() => setResultTab('resume')}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          resultTab === 'resume'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        优化版简历
                      </button>
                    </div>
                  )}
                  {result && !loading && (
                    <Link
                      href="/interview"
                      className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                    >
                      去模拟面试 →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loading && (
                    <button
                      onClick={handleStop}
                      className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      停止生成
                    </button>
                  )}
                  {result && !loading && resultTab === 'report' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleCopy}
                        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        复制
                      </button>
                      <button
                        onClick={handleDownloadMarkdown}
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
                  )}
                  {result && !loading && resultTab === 'resume' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleResumeCopy}
                        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        复制
                      </button>
                      <button
                        onClick={handleResumeExportMarkdown}
                        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={handleResumeExportWord}
                        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Word
                      </button>
                      <button
                        onClick={handleResumeExportPDF}
                        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {copyMessage && (
                <p className="mb-3 text-xs text-green-600">{copyMessage}</p>
              )}

              {/* Score card */}
              {scoring && !score && (
                <div className="mb-5 animate-pulse rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-white"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-white"></div>
                      <div className="h-3 w-2/3 rounded bg-white"></div>
                    </div>
                  </div>
                </div>
              )}

              {score && (
                <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-blue-600 shadow-sm">
                      {score.score}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          简历评分
                        </span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          JD 匹配度 {score.matchPercentage}%
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {score.summary}
                      </p>
                    </div>
                  </div>

                  {score.keywords.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">
                        关键词匹配
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {score.keywords.map((k, idx) => (
                          <span
                            key={idx}
                            title={k.suggestion || ''}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              k.matched
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {k.word}
                            {k.matched ? ' ✓' : ' ✗'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {score.suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">
                        改进建议
                      </p>
                      <ul className="space-y-1.5">
                        {score.suggestions.map((s, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"></span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!result && !loading && (
                <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                  <p className="text-slate-500">填写左侧信息后点击「开始优化」</p>
                  <p className="mt-1 text-sm text-slate-400">
                    结果将在这里展示
                  </p>
                  <button
                    onClick={() => {
                      fillExample();
                      scrollToEditor();
                    }}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    查看演示
                  </button>
                </div>
              )}

              {loading && !result && (
                <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                  <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="text-slate-600">AI 正在分析你的简历...</p>
                  <p className="mt-1 text-sm text-slate-400">
                    大约需要 10-30 秒
                  </p>
                </div>
              )}

              {result && resultTab === 'report' && (
                <div className="relative max-h-[800px] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-5">
                  <MarkdownRenderer ref={resultRef} content={result} />
                  {loading && (
                    <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-600"></span>
                  )}
                </div>
              )}

              {result && resultTab === 'resume' && (
                <div className="space-y-4">
                  {!editedResume ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                      <p className="text-slate-500">未识别到「优化版简历」部分</p>
                      <p className="mt-1 text-sm text-slate-400">
                        请切换回「完整报告」查看结果
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          选择模板：
                        </span>
                        {(['classic', 'modern', 'minimal'] as ResumeTemplateType[]).map(
                          (t) => (
                            <button
                              key={t}
                              onClick={() => setResumeTemplate(t)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                resumeTemplate === t
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {t === 'classic'
                                ? '经典简洁'
                                : t === 'modern'
                                ? '现代专业'
                                : '极简紧凑'}
                            </button>
                          )
                        )}
                        <button
                          onClick={resetEditedResume}
                          className="ml-auto rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          重置修改
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500">
                          在线编辑
                        </label>
                        <textarea
                          value={editedResume}
                          onChange={(e) => setEditedResume(e.target.value)}
                          rows={10}
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500">
                          预览
                        </label>
                        <div className="mt-1">
                          <ResumeTemplate
                            ref={resumePreviewRef}
                            content={editedResume}
                            template={resumeTemplate}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quota & Payment Section */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                我的额度
              </h3>
              {user ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    今日免费次数：
                    <span className="font-medium">
                      {getRemainingFree()}/{FREE_DAILY_LIMIT}
                    </span>
                  </p>
                  <p>
                    剩余额度：
                    <span className="font-medium">{user.credits} 次</span>
                  </p>
                  <p>
                    会员状态：
                    <span
                      className={
                        user.hasSubscription
                          ? 'font-medium text-green-600'
                          : 'font-medium text-slate-500'
                      }
                    >
                      {user.hasSubscription
                        ? `有效期至 ${new Date(user.subscriptionEndsAt!).toLocaleDateString('zh-CN')}`
                        : '未开通'}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  登录后查看额度，每天免费 {FREE_DAILY_LIMIT} 次
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">
                兑换码
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="输入兑换码"
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={handleRedeem}
                    disabled={!redeemCode.trim() || !user}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    兑换
                  </button>
                </div>
                {redeemMessage && (
                  <p
                    className={`text-sm ${
                      redeemMessage.includes('成功')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {redeemMessage}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  购买额度或会员后，会收到兑换码，在此输入即可到账。
                </p>
              </div>
            </div>
          </div>

          {/* Payment Guide */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 ring-1 ring-blue-100">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              购买额度
            </h3>

            {!selectedPackage ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {DEFAULT_PACKAGES.map((pkg, index) => (
                  <button
                    key={pkg.name}
                    onClick={() => handleSelectPackage(pkg, index)}
                    disabled={paymentLoading}
                    className="rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-blue-200 disabled:opacity-70"
                  >
                    <p className="text-base font-semibold text-slate-900">
                      {pkg.name}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">
                      ¥{pkg.price}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {pkg.type === 'credits'
                        ? `获得 ${pkg.value} 次优化额度`
                        : `获得 ${pkg.value} 天会员`}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">已选套餐</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {selectedPackage.name} · ¥{selectedPackage.price}
                      </p>
                    </div>
                    <button
                      onClick={resetPayment}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      重新选择
                    </button>
                  </div>

                  <ol className="space-y-2 text-sm text-slate-600">
                    <li>1. 微信扫码付款</li>
                    <li>2. 截图保存付款成功页面</li>
                    <li>3. 点击下方按钮上传截图</li>
                    <li>4. 系统自动识别金额并发放兑换码</li>
                  </ol>

                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => screenshotInputRef.current?.click()}
                    disabled={paymentLoading || !paymentOrderId}
                    className="mt-4 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {paymentLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                        正在处理...
                      </span>
                    ) : paymentScreenshotName ? (
                      '重新上传截图'
                    ) : (
                      '我已付款，上传截图'
                    )}
                  </button>

                  {paymentScreenshotName && !paymentSuccess && (
                    <p className="mt-2 text-xs text-slate-500">
                      已上传：{paymentScreenshotName}
                    </p>
                  )}

                  {paymentError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {paymentError}
                    </div>
                  )}

                  {paymentSuccess && paymentCode && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-sm font-medium text-green-800">
                        验证成功，你的兑换码：
                      </p>
                      <p className="mt-1 select-all font-mono text-lg font-bold text-green-700">
                        {paymentCode}
                      </p>
                      <button
                        onClick={handleRedeemPaymentCode}
                        className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        立即兑换到账
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <img
                      src="/wechat-qr.jpg"
                      alt="微信支付"
                      className="h-44 w-44 object-contain"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">微信扫码支付</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-slate-500">
            <p>基于 DeepSeek AI 构建 · 仅供求职参考，请根据实际情况调整</p>
          </div>
        </div>
      </div>
    </div>
  );
}
