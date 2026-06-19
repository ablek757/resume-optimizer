'use client';

interface CTAProps {
  onStart: () => void;
}

export default function CTA({ onStart }: CTAProps) {
  return (
    <section className="bg-blue-600 px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-white">
          准备好拿到心仪的 offer 了吗？
        </h2>
        <p className="mt-4 text-blue-100">
          每天 3 次免费优化，先用起来，满意再付费。
        </p>
        <button
          onClick={onStart}
          className="mt-8 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-600 shadow-lg transition-all hover:bg-blue-50"
        >
          立即开始优化
        </button>
      </div>
    </section>
  );
}
