'use client';

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
          <span className="mr-2 flex h-2 w-2 rounded-full bg-blue-600"></span>
          基于 DeepSeek AI 的简历优化助手
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          让 AI 帮你写出
          <span className="block text-blue-600">HR 想看的简历</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          上传简历 PDF/图片，或粘贴文字，AI 根据目标岗位自动优化内容、补充亮点、预测面试题，让你的简历通过率提升数倍。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onStart}
            className="rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-xl"
          >
            立即免费优化
          </button>
          <p className="text-sm text-slate-500">每天免费 3 次，无需信用卡</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { value: '30秒', label: '快速生成优化版' },
            { value: '10万+', label: '已优化简历' },
            { value: '95%', label: '用户满意度' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
