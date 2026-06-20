'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Stethoscope } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

interface DiagnoseResult {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export default function DiagnosePage() {
  const { user, loading: userLoading } = useUser();
  const [resume, setResume] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/quick-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '诊断失败');
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '诊断失败');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle>请先登录</CardTitle>
          <CardDescription>登录后使用 AI 快速诊断</CardDescription>
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="AI 简历快速诊断"
        description="60 秒定位简历问题，获取改进建议（免费）"
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">目标岗位（可选）</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="例如：产品经理"
                className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                简历内容 <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="粘贴你的简历文字内容"
                rows={10}
                className="mt-1"
                required
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading || !resume.trim()}>
              <Stethoscope className="mr-1.5 h-4 w-4" />
              {loading ? '诊断中...' : '开始诊断'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>诊断结果</CardTitle>
                <CardDescription>{result.summary}</CardDescription>
              </div>
              <Badge variant={result.score >= 70 ? 'success' : result.score >= 50 ? 'warning' : 'destructive'}>
                {result.score} 分
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">亮点</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">待改进</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {result.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">优化建议</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
