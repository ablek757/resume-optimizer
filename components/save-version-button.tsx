'use client';

import { useState } from 'react';

interface SaveVersionButtonProps {
  title: string;
  jobTitle: string;
  jobDescription?: string;
  originalText?: string;
  optimizedText: string;
  source: 'optimize' | 'jd-rewrite' | 'manual';
  onSaved?: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  optimize: '简历优化',
  'jd-rewrite': 'JD 改写',
  manual: '手动编辑',
};

export default function SaveVersionButton({
  title,
  jobTitle,
  jobDescription,
  originalText,
  optimizedText,
  source,
  onSaved,
}: SaveVersionButtonProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!optimizedText.trim()) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/resume-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || `${jobTitle} - ${SOURCE_LABEL[source]}`,
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription || '',
          originalText: originalText || '',
          optimizedText: optimizedText.trim(),
          source,
          isDefault: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setMessage('已保存');
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSave}
        disabled={saving || !optimizedText.trim()}
        className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? '保存中...' : '保存为版本'}
      </button>
      {message && (
        <span
          className={`text-xs ${
            message.includes('失败') || message.includes('错误')
              ? 'text-red-600'
              : 'text-green-600'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
