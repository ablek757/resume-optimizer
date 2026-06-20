'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/ui/toast';

interface ResumeVersion {
  id: string;
  title: string;
  jobTitle: string;
  jobDescription: string | null;
  originalText: string | null;
  optimizedText: string;
  source: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const DRAFT_KEY = 'resume_optimizer_draft';
const SOURCE_TEXT: Record<string, string> = {
  optimize: '简历优化',
  'jd-rewrite': 'JD 改写',
  manual: '手动创建',
};

export default function ResumesPage() {
  const { toast } = useToast();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/resume-versions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取失败');
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取简历版本失败');
    } finally {
      setLoading(false);
    }
  };

  const loadToEditor = (version: ResumeVersion) => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          jobTitle: version.jobTitle,
          jobDescription: version.jobDescription || '',
          resume: version.originalText || '',
        })
      );
      localStorage.setItem(
        'resume_optimizer_loaded_version',
        JSON.stringify(version)
      );
    } catch (err) {
      console.error('Save draft error:', err);
    }
  };

  const setDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/resume-versions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '设置失败');
      }
      setVersions((prev) =>
        prev.map((v) => ({ ...v, isDefault: v.id === id }))
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : '设置默认失败', 'error');
    }
  };

  const startEdit = (version: ResumeVersion) => {
    setEditingId(version.id);
    setEditTitle(version.title);
  };

  const saveTitle = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/resume-versions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      setVersions((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, title: editTitle.trim() } : v
        )
      );
      setEditingId(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const deleteVersion = async (id: string) => {
    if (!confirm('确定删除这个简历版本吗？')) return;
    try {
      const res = await fetch(`/api/resume-versions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '删除失败');
      }
      setVersions((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="简历版本管理"
        description="保存多个岗位方向的简历，随时切换、编辑和导出"
      >
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回首页
          </Button>
        </Link>
      </PageHeader>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {versions.length === 0 ? (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>暂无保存的简历版本</CardTitle>
            <CardDescription>
              优化简历后可以将结果保存为版本，方便多岗位管理
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>去优化简历 →</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((version) => (
            <Card
              key={version.id}
              className={version.isDefault ? 'border-2 border-primary' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  {editingId === version.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(version.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveTitle(version.id)}
                      >
                        保存
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <CardTitle
                        className="cursor-pointer hover:text-primary"
                        onClick={() => startEdit(version)}
                        title="点击修改标题"
                      >
                        {version.title}
                      </CardTitle>
                      <CardDescription>{version.jobTitle}</CardDescription>
                    </div>
                  )}
                  {version.isDefault && (
                    <Badge variant="default">
                      <Star className="mr-1 h-3 w-3" />
                      默认
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>
                  来源：
                  <span className="font-medium text-foreground">
                    {SOURCE_TEXT[version.source] || version.source}
                  </span>
                </p>
                <p>更新于：{formatDate(version.updatedAt)}</p>
              </CardContent>

              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link
                      href="/"
                      onClick={() => loadToEditor(version)}
                    >
                      <FileText className="mr-1.5 h-4 w-4" />
                      加载到编辑器
                    </Link>
                  </Button>
                  {!version.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefault(version.id)}
                    >
                      设为默认
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive hover:bg-destructive/10"
                    onClick={() => deleteVersion(version.id)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
