'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
      localStorage.setItem('resume_optimizer_loaded_version', JSON.stringify(version));
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
      alert(err instanceof Error ? err.message : '设置默认失败');
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
        prev.map((v) => (v.id === id ? { ...v, title: editTitle.trim() } : v))
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    }
  };

  const deleteVersion = async (id: string) => {
    if (!confirm('确定删除这个简历版本吗？')) return;
    try {
      const res = await fetch(`/api/resume-versions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '删除失败');
      }
      setVersions((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">简历版本管理</h1>
            <p className="mt-1 text-sm text-slate-600">
              保存多个岗位方向的简历，随时切换、编辑和导出
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回首页
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {versions.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">暂无保存的简历版本</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              去优化简历 →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition-colors ${
                  version.isDefault ? 'ring-blue-300' : 'ring-slate-200'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  {editingId === version.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(version.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => saveTitle(version.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <h3
                        className="cursor-pointer font-semibold text-slate-900 hover:text-blue-600"
                        onClick={() => startEdit(version)}
                        title="点击修改标题"
                      >
                        {version.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">{version.jobTitle}</p>
                    </div>
                  )}
                  {version.isDefault && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      默认
                    </span>
                  )}
                </div>

                <div className="mb-4 space-y-1 text-xs text-slate-500">
                  <p>
                    来源：
                    <span className="font-medium text-slate-700">
                      {SOURCE_TEXT[version.source] || version.source}
                    </span>
                  </p>
                  <p>更新于：{formatDate(version.updatedAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/"
                    onClick={() => loadToEditor(version)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    加载到编辑器
                  </Link>
                  {!version.isDefault && (
                    <button
                      onClick={() => setDefault(version.id)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      设为默认
                    </button>
                  )}
                  <button
                    onClick={() => deleteVersion(version.id)}
                    className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
