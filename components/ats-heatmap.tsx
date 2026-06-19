'use client';

import { useState } from 'react';
import { ATSReport } from '@/lib/ats-checker';

interface ATSHeatmapProps {
  report: ATSReport;
}

function scoreColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.8) return 'bg-green-500';
  if (ratio >= 0.6) return 'bg-yellow-400';
  if (ratio >= 0.4) return 'bg-orange-400';
  return 'bg-red-500';
}

function scoreTextColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.8) return 'text-green-700';
  if (ratio >= 0.6) return 'text-yellow-700';
  if (ratio >= 0.4) return 'text-orange-700';
  return 'text-red-700';
}

function scoreLabel(ratio: number): string {
  if (ratio >= 0.8) return '优秀';
  if (ratio >= 0.6) return '良好';
  if (ratio >= 0.4) return '一般';
  return '需优化';
}

export default function ATSHeatmap({ report }: ATSHeatmapProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white text-3xl font-bold text-emerald-600 shadow-sm">
          {report.overallScore}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">ATS 综合评分</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreTextColor(
                report.overallScore,
                100
              )} bg-white`}
            >
              {scoreLabel(report.overallScore / 100)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            ATS 解析友好度 {report.parserFriendlyScore}% · 满分 100
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
            <div className="rounded-md bg-white px-2 py-1">
              长度{report.readability.lengthOk ? '适中' : '异常'}
            </div>
            <div className="rounded-md bg-white px-2 py-1">
              Bullet {report.readability.bulletUsage}%
            </div>
            <div className="rounded-md bg-white px-2 py-1">
              量化 {report.readability.quantifiedRatio}%
            </div>
            <div className="rounded-md bg-white px-2 py-1">
              {report.readability.hasContact ? '已留联系方式' : '缺少联系方式'}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-slate-500">模块热图（面积 = 权重，颜色 = 得分）</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {report.sectionScores.map((section) => {
            const ratio = section.score / section.max;
            return (
              <button
                key={section.name}
                onClick={() =>
                  setExpandedSection(expandedSection === section.name ? null : section.name)
                }
                className={`relative overflow-hidden rounded-lg p-3 text-left text-white transition-transform hover:scale-[1.02] ${scoreColor(
                  section.score,
                  section.max
                )}`}
                style={{ minHeight: `${60 + section.weight * 1.2}px` }}
              >
                <div className="relative z-10">
                  <p className="text-xs font-medium opacity-90">{section.name}</p>
                  <p className="text-lg font-bold">
                    {section.score}/{section.max}
                  </p>
                  <p className="text-[10px] opacity-90">{scoreLabel(ratio)}</p>
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/10"
                  style={{ height: `${(1 - ratio) * 100}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {expandedSection && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
          {report.sectionScores
            .filter((s) => s.name === expandedSection)
            .map((s) => (
              <div key={s.name}>
                <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                {s.issues.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {s.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                        <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-red-500"></span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
                {s.suggestions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {s.suggestions.map((sg, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                        <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500"></span>
                        {sg}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}

      {report.keywordMatches.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-500">JD 关键词匹配</p>
          <div className="flex flex-wrap gap-2">
            {report.keywordMatches.map((k, i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  k.matched
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
                title={k.matched ? `出现 ${k.count} 次` : '未出现'}
              >
                {k.word} {k.matched ? `×${k.count}` : '✗'}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">优化建议</p>
          <ul className="space-y-1.5">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500"></span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
