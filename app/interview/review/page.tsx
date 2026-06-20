'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import InterviewReviewReport from '@/components/interview-review-report';
import { InterviewReviewResult } from '@/lib/interview-review-prompt';
import { Upload, ArrowLeft, Loader2 } from 'lucide-react';

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
  const { user, loading: loadingUser } = useUser();

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
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>登录后使用面试复盘分析</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>返回首页登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="面试复盘分析"
        description="上传真实面试录音，AI 帮你分析回答内容、表达和逻辑"
      >
        <Link href="/interview">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回面试模拟
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>开始复盘</CardTitle>
          <CardDescription>上传录音并补充岗位信息，AI 将生成复盘报告</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {pendingTextReview && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm text-foreground">
                已加载刚刚的模拟面试记录，可以直接进行文字复盘。
              </p>
              <Button
                type="button"
                onClick={handleTextReview}
                disabled={analyzing}
                className="mt-3"
                size="sm"
              >
                {analyzing ? '分析中...' : '复盘本次模拟面试（免费）'}
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                上传面试录音 <span className="text-destructive">*</span>
              </label>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/50 hover:bg-accent/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  onChange={onFileChange}
                  className="hidden"
                />
                <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · 点击重新上传
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">点击或拖拽上传录音</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      支持 mp3、wav、m4a、webm，最大 {MAX_FILE_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                目标岗位 <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="例如：产品经理"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">岗位 JD（可选）</label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴招聘要求，复盘会更精准"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">你的简历（可选）</label>
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="粘贴简历内容，AI 会结合你的经历做更精准的复盘"
                rows={6}
              />
            </div>

            <Button
              type="submit"
              disabled={!file || !jobTitle.trim() || analyzing}
              className="w-full"
              size="lg"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI 正在分析录音...
                </>
              ) : (
                '开始复盘分析（消耗 1 次额度）'
              )}
            </Button>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {report && <InterviewReviewReport report={report} />}
    </div>
  );
}
