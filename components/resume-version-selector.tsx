'use client';

import { useState, useEffect } from 'react';

interface ResumeVersion {
  id: string;
  title: string;
  jobTitle: string;
  jobDescription: string | null;
  originalText: string | null;
  optimizedText: string;
  source: string;
  isDefault: boolean;
  updatedAt: string;
}

interface ResumeVersionSelectorProps {
  onLoad: (version: {
    jobTitle: string;
    jobDescription: string;
    resume: string;
    optimizedText?: string;
  }) => void;
}

export default function ResumeVersionSelector({ onLoad }: ResumeVersionSelectorProps) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/resume-versions')
      .then((res) => res.json())
      .then((data) => {
        setVersions(data.versions || []);
      })
      .catch((err) => console.error('Fetch versions error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const version = versions.find((v) => v.id === id);
    if (!version) return;
    onLoad({
      jobTitle: version.jobTitle,
      jobDescription: version.jobDescription || '',
      resume: version.originalText || '',
      optimizedText: version.optimizedText,
    });
  };

  if (loading) {
    return (
      <div className="text-xs text-slate-500">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"></span>
        加载版本中...
      </div>
    );
  }

  if (versions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">加载已保存版本：</span>
      <select
        onChange={handleChange}
        defaultValue=""
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="">请选择</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.title} {v.isDefault ? '（默认）' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
