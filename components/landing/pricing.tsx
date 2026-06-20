'use client';

import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const packages = [
  {
    name: '免费体验',
    price: '¥0',
    period: '/天',
    description: '每天 3 次免费优化',
    features: ['每日 3 次免费', '基础简历优化', 'PDF/图片识别'],
    highlighted: false,
  },
  {
    name: '按次购买',
    price: '¥9.9',
    period: '/10次',
    description: '适合短期求职',
    features: ['10 次优化额度', '岗位 JD 匹配', '面试题预测', '结果导出'],
    highlighted: true,
  },
  {
    name: '月度会员',
    price: '¥29.9',
    period: '/月',
    description: '求职季最佳选择',
    features: ['30 天内无限次', '全部高级功能', '优先响应速度', '专属客服'],
    highlighted: false,
  },
];

interface PricingProps {
  onStart: () => void;
}

export default function Pricing({ onStart }: PricingProps) {
  return (
    <section id="pricing" className="bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">简单透明的价格</h2>
          <p className="mt-4 text-muted-foreground">先免费体验，满意再付费</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`rounded-2xl p-6 ${
                pkg.highlighted
                  ? 'bg-primary text-primary-foreground shadow-xl ring-1 ring-primary'
                  : 'bg-card text-foreground shadow-sm ring-1 ring-border'
              }`}
            >
              <h3 className="text-lg font-semibold">{pkg.name}</h3>
              <p
                className={`mt-2 text-sm ${
                  pkg.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}
              >
                {pkg.description}
              </p>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold">{pkg.price}</span>
                <span
                  className={`ml-1 text-sm ${
                    pkg.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {pkg.period}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        pkg.highlighted ? 'text-primary-foreground' : 'text-primary'
                      }`}
                    />
                    <span
                      className={
                        pkg.highlighted ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={onStart}
                variant={pkg.highlighted ? 'secondary' : 'outline'}
                className="mt-6 w-full"
              >
                {pkg.name === '免费体验' ? '免费试用' : '立即购买'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
