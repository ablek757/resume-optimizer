'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'AI 优化后的简历会不会编造经历？',
    answer:
      '不会。我们的 Prompt 明确要求 AI 基于你提供的真实经历进行优化，只改写表达方式、补充行业关键词、优化结构，不会虚构你没有做过的事情。',
  },
  {
    question: '免费次数用完后怎么付费？',
    answer:
      '每天免费 3 次。用完后可以选择购买 10 次额度包（¥9.9）或月度会员（¥29.9）。付款后上传截图，系统会自动识别金额并发放兑换码。',
  },
  {
    question: '上传的简历会被保存吗？',
    answer:
      '上传的简历仅用于当前优化，我们不会将简历内容用于模型训练。支付截图会保留在订单记录中，方便你和管理员核对。',
  },
  {
    question: '支持哪些格式的简历？',
    answer:
      '支持 PDF、PNG、JPG、WebP 等常见格式，也可以直接粘贴文字内容。',
  },
  {
    question: '优化结果可以直接投递吗？',
    answer:
      '可以。优化结果支持一键复制，也可以导出 Markdown、Word、PDF 格式。建议你再根据个人情况微调后投递。',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-muted/50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">常见问题</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-border"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="font-semibold text-foreground">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
