'use client';

import { useState, useEffect } from 'react';

interface OnboardingProps {
  onStartDemo: () => void;
  onClose: () => void;
}

const ONBOARDING_KEY = 'resume_optimizer_onboarded';

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (!seen) setShow(true);
    } catch {
      // ignore
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    setShow(false);
  };

  return { show, close };
}

export default function Onboarding({ onStartDemo, onClose }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '上传或粘贴简历',
      desc: '支持 PDF / 图片 OCR 提取，也可以直接粘贴文字。',
    },
    {
      title: '填写目标岗位和 JD',
      desc: '岗位描述越详细，AI 优化结果越精准。',
    },
    {
      title: '查看优化结果并导出',
      desc: '获得简历评分、优化版简历、面试题和投递建议，一键导出 PDF/Word。',
    },
  ];

  const handleDemo = () => {
    onStartDemo();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            欢迎使用 AI 简历优化
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 space-y-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`flex gap-3 rounded-xl p-3 transition-colors ${
                step === idx ? 'bg-blue-50 ring-1 ring-blue-100' : 'bg-slate-50'
              }`}
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  step === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx + 1}
              </div>
              <div>
                <p className="font-medium text-slate-900">{s.title}</p>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`h-2 w-2 rounded-full ${
                  step === idx ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                上一步
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleDemo}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                查看演示
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
