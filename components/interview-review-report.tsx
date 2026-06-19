import { InterviewReviewResult } from '@/lib/interview-review-prompt';
import { useState } from 'react';

interface InterviewReviewReportProps {
  report: InterviewReviewResult;
}

function scoreColor(score: number): string {
  if (score >= 8) return 'bg-green-500';
  if (score >= 6) return 'bg-yellow-400';
  if (score >= 4) return 'bg-orange-400';
  return 'bg-red-500';
}

function scoreText(score: number): string {
  if (score >= 8) return '优秀';
  if (score >= 6) return '良好';
  if (score >= 4) return '一般';
  return '需加强';
}

export default function InterviewReviewReport({ report }: InterviewReviewReportProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  const scoreItems = [
    { label: '内容质量', key: 'content' as const },
    { label: '表达质量', key: 'expression' as const },
    { label: '逻辑结构', key: 'logic' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-white text-4xl font-bold text-blue-600 shadow-sm">
            {report.scores.overall}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold text-slate-900">综合评分</p>
            <p className="text-sm text-slate-600">{scoreText(report.scores.overall)}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {scoreItems.map((item) => {
                const value = report.scores[item.key];
                return (
                  <div key={item.key} className="rounded-lg bg-white p-2 text-center shadow-sm">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-bold text-slate-800">{value}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full ${scoreColor(value)}`}
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pace / expression analysis */}
      {report.paceAnalysis && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">表达与语速分析</h3>
          <p className="text-sm text-slate-700">{report.paceAnalysis}</p>
        </div>
      )}

      {/* Strengths / issues / suggestions */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <h3 className="mb-2 text-sm font-semibold text-green-900">亮点</h3>
          <ul className="space-y-1.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-green-800">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-green-600"></span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
          <h3 className="mb-2 text-sm font-semibold text-red-900">问题</h3>
          <ul className="space-y-1.5">
            {report.issues.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-800">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-red-600"></span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">改进建议</h3>
          <ul className="space-y-1.5">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-600"></span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Example improvements */}
      {report.exampleImprovements.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">参考回答优化</h3>
          <div className="space-y-4">
            {report.exampleImprovements.map((ex, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">问题</p>
                <p className="text-sm text-slate-900">{ex.question}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-red-600">原回答</p>
                    <p className="text-xs text-slate-700">{ex.originalAnswer}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-600">优化后</p>
                    <p className="text-xs text-slate-700">{ex.improvedAnswer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {report.transcript && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="mb-2 text-sm font-semibold text-slate-900 hover:text-blue-600"
          >
            {showTranscript ? '隐藏' : '显示'}面试转录文本
          </button>
          {showTranscript && (
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {report.transcript}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
