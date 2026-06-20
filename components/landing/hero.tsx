'use client';

import { Button } from '@/components/ui/button';

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-background px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm text-primary shadow-sm">
          <span className="mr-2 flex h-2 w-2 rounded-full bg-primary"></span>
          基于 DeepSeek AI 的简历优化助手
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          让 AI 帮你写出
          <span className="block text-primary">HR 想看的简历</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          上传简历 PDF/图片，或粘贴文字，AI 根据目标岗位自动优化内容、补充亮点、预测面试题，让你的简历通过率提升数倍。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" onClick={onStart}>
            立即免费优化
          </Button>
          <p className="text-sm text-muted-foreground">每天免费 3 次，无需信用卡</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { value: '30秒', label: '快速生成优化版' },
            { value: '10万+', label: '已优化简历' },
            { value: '95%', label: '用户满意度' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
            >
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
