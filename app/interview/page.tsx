'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic2 } from 'lucide-react';
import InterviewChat, { ChatMessage } from '@/components/interview-chat';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

interface HistoryItem {
  id: string;
  jobTitle: string;
  jobDescription: string | null;
  originalText: string;
}

const FREE_DAILY_LIMIT = 3;

export default function InterviewPage() {
  const { user, loading: loadingUser, refresh } = useUser();
  const [histories, setHistories] = useState<HistoryItem[]>([]);

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
    fetchHistories();
  }, []);

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
      refresh();
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

  const router = useRouter();

  const handleReview = () => {
    try {
      localStorage.setItem(
        'resume_optimizer_interview_for_review',
        JSON.stringify({
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          resume: resume.trim(),
          messages,
        })
      );
    } catch (err) {
      console.error('Save interview review draft error:', err);
    }
    router.push('/interview/review');
  };

  if (loadingUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle>请先登录</CardTitle>
          <CardDescription>登录后使用 AI 面试模拟</CardDescription>
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
        title="AI 面试模拟"
        description="基于简历和岗位 JD，AI 面试官陪你实战演练"
      >
        <Link href="/">
          <Button variant="outline">返回首页</Button>
        </Link>
      </PageHeader>

      {!interviewing ? (
        <Card>
          <CardHeader>
            <CardTitle>准备面试</CardTitle>
            <CardDescription>
              填写岗位信息和简历内容，开始一场模拟面试
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {histories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  从历史记录快速选择
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {histories.map((h) => (
                    <Button
                      key={h.id}
                      variant="outline"
                      size="sm"
                      onClick={() => selectHistory(h)}
                    >
                      {h.jobTitle}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="jobTitle"
                className="block text-sm font-medium text-foreground"
              >
                目标岗位 <span className="text-destructive">*</span>
              </label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="例如：产品经理"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="jobDescription"
                className="block text-sm font-medium text-foreground"
              >
                岗位 JD（可选）
              </label>
              <Textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴招聘要求，面试题会更精准"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="resume"
                className="block text-sm font-medium text-foreground"
              >
                简历内容 <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="resume"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="粘贴你的简历内容"
                rows={10}
              />
              <p className="text-right text-xs text-muted-foreground">
                {resume.length} / 8000 字
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="language"
                className="block text-sm font-medium text-foreground"
              >
                面试语言
              </label>
              <Select
                id="language"
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as 'zh' | 'en' | 'bilingual')
                }
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="bilingual">中英双语</option>
              </Select>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <Mic2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                也可以{' '}
                <Link
                  href="/interview/review"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  上传真实面试录音进行复盘分析 →
                </Link>
              </p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 rounded-lg bg-secondary/50 p-4 sm:flex-row sm:items-center">
              {user.hasSubscription ? (
                <Badge variant="success">会员有效期内可直接开始</Badge>
              ) : (
                <Badge variant="secondary">
                  今日免费 {getRemainingFree()}/{FREE_DAILY_LIMIT} 次
                  {user.credits > 0 && ` · 剩余额度 ${user.credits} 次`}
                </Badge>
              )}
              <Button
                onClick={startInterview}
                disabled={loading || !jobTitle.trim() || !resume.trim()}
              >
                {loading ? '准备中...' : '开始面试'}
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              岗位：<span className="font-medium text-foreground">{jobTitle}</span>
            </div>
            {!finished && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetInterview}
                className="text-muted-foreground hover:text-destructive"
              >
                结束面试
              </Button>
            )}
          </div>

          <InterviewChat
            messages={messages}
            loading={loading}
            finished={finished}
            onSend={sendAnswer}
            onFinish={resetInterview}
            onReview={handleReview}
          />

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
