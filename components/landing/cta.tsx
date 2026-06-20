'use client';

import { Button } from '@/components/ui/button';

interface CTAProps {
  onStart: () => void;
}

export default function CTA({ onStart }: CTAProps) {
  return (
    <section className="bg-primary px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-primary-foreground">
          准备好拿到心仪的 offer 了吗？
        </h2>
        <p className="mt-4 text-primary-foreground/80">
          每天 3 次免费优化，先用起来，满意再付费。
        </p>
        <Button
          onClick={onStart}
          size="lg"
          variant="secondary"
          className="mt-8"
        >
          立即开始优化
        </Button>
      </div>
    </section>
  );
}
