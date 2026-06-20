'use client';

const steps = [
  {
    step: '01',
    title: '上传或粘贴简历',
    description: '支持 PDF、图片上传，也可以直接粘贴简历文字。',
  },
  {
    step: '02',
    title: '填写目标岗位',
    description: '输入你想应聘的岗位，可粘贴岗位 JD 让优化更精准。',
  },
  {
    step: '03',
    title: 'AI 生成优化版',
    description: '30 秒内获得结构清晰、亮点突出的优化版简历和面试建议。',
  },
  {
    step: '04',
    title: '导出直接投递',
    description: '一键复制或导出 Word/PDF，直接用于求职投递。',
  },
];

export default function Steps() {
  return (
    <section id="steps" className="bg-muted/50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">四步搞定简历优化</h2>
          <p className="mt-4 text-muted-foreground">简单快捷，不用学习任何复杂操作</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="relative">
              <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
                <div className="mb-4 text-3xl font-black text-primary/20">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
