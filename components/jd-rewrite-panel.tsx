'use client';

import { useState } from 'react';
import { computeLineDiff, DiffLine } from '@/lib/diff';
import SaveVersionButton from './save-version-button';

interface JDRewriteResult {
  rewrittenResume: string;
  addedKeywords: string[];
  removedKeywords: string[];
  matchedKeywords: string[];
  matchPercentage: number;
  suggestions: string[];
}

interface JDRewritePanelProps {
  jobTitle: string;
  resume: string;
  jobDescription: string;
  language: 'zh' | 'en' | 'bilingual';
  onClose?: () => void;
}

export default function JDRewritePanel({
  jobTitle,
  resume,
  jobDescription,
  language,
  onClose,
}: JDRewritePanelProps) {
  const [result, setResult] = useState<JDRewriteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiff, setShowDiff] = useState(true);

  const handleRewrite = async () => {
    if (!jobTitle.trim() || !resume.trim() || !jobDescription.trim()) {
      setError('请填写目标岗位、简历内容和岗位 JD');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/rewrite-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          resume: resume.trim(),
          jobDescription: jobDescription.trim(),
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
        throw new Error(data.error || '改写失败');
      }

      if (data.result) setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '改写失败');
    } finally {
      setLoading(false);
    }
  };

  const diffLines: DiffLine[] = result
    ? computeLineDiff(resume.trim(), result.rewrittenResume.trim())
    : [];

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-indigo-900">JD 关键词智能改写</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            关闭
          </button>
        )}
      </div>

      {!result && !loading && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            AI 会根据左侧 JD，把简历描述向岗位高频关键词对齐，提高 ATS 通过率。
          </p>
          <button
            onClick={handleRewrite}
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {loading ? '改写中...' : '开始 JD 关键词改写（消耗 1 次额度）'}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></span>
          AI 正在根据 JD 改写简历关键词...
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm">
              匹配度 {result.matchPercentage}%
            </span>
            {result.addedKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-slate-500">新增关键词：</span>
                {result.addedKeywords.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>

          {result.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-slate-500">已匹配关键词：</span>
              {result.matchedKeywords.map((k, i) => (
                <span
                  key={i}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {result.removedKeywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-slate-500">弱化/替换关键词：</span>
              {result.removedKeywords.map((k, i) => (
                <span
                  key={i}
                  className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600 line-through"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiff((v) => !v)}
              className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {showDiff ? '隐藏对比' : '显示对比'}
            </button>
            <SaveVersionButton
              title={`${jobTitle} - JD 改写`}
              jobTitle={jobTitle}
              jobDescription={jobDescription}
              originalText={resume}
              optimizedText={result.rewrittenResume}
              source="jd-rewrite"
            />
          </div>

          {showDiff ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-xs">
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
                      <td className="w-1/2 whitespace-pre-wrap border-r border-slate-100 px-3 py-1.5 text-slate-700">
                        {line.left ?? ''}
                      </td>
                      <td className="w-1/2 whitespace-pre-wrap px-3 py-1.5 text-slate-700">
                        {line.right ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
              <pre className="whitespace-pre-wrap text-xs text-slate-800">
                {result.rewrittenResume}
              </pre>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">后续建议</p>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-500"></span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleRewrite}
            disabled={loading}
            className="w-full rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            重新改写
          </button>
        </div>
      )}
    </div>
  );
}
