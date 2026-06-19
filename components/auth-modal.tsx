'use client';

import { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  if (!isOpen) return null;

  const sendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '发送失败');
      }

      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 测试模式下后端会返回验证码
      if (data.code) {
        setCode(data.code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '验证失败');
      }

      onLogin(email);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">登录 / 注册</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          登录后可获得每日免费次数，也可购买额度继续使用。
        </p>

        {step === 'email' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                邮箱地址
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                验证码已发送至 {email}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="请输入 6 位验证码"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-2xl tracking-[0.5em] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            <button
              onClick={sendCode}
              disabled={countdown > 0 || loading}
              className="w-full rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
            >
              {countdown > 0 ? `${countdown} 秒后重发` : '重新发送验证码'}
            </button>

            <button
              onClick={() => setStep('email')}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              使用其他邮箱
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
