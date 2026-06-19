export type QuickDiagnoseLanguage = 'zh' | 'en' | 'bilingual';

export function buildQuickDiagnosePrompt(
  jobTitle: string,
  resume: string,
  jobDescription?: string,
  language: QuickDiagnoseLanguage = 'zh'
): string {
  const jdSection = jobDescription
    ? `\n【目标岗位 JD】\n${jobDescription}`
    : '';

  const languageInstruction =
    language === 'en'
      ? 'Return all text fields in English.'
      : language === 'bilingual'
      ? 'Return summary and issues in Chinese, but include English translations for action items.'
      : '全部使用中文';

  return `你是一位资深 HR 总监和简历优化专家。请针对以下简历和目标岗位，给出一个极简但高价值的快速诊断。

【目标岗位】
${jobTitle}

【简历内容】
${resume}${jdSection}

请严格按以下 JSON 格式返回，不要包含任何其他说明文字或 Markdown 代码块：

{
  "score": 7.5,
  "summary": "一句话总体评价，30 字以内",
  "issues": [
    {
      "title": "问题 1 标题",
      "problem": "具体指出这个问题在简历中如何体现",
      "fix": "一句话修改方向"
    }
  ],
  "actions": [
    "第一条立即可执行的改进建议",
    "第二条立即可执行的改进建议",
    "第三条立即可执行的改进建议"
  ]
}

要求：
- ${languageInstruction}
- score：1-10 分，精确到 0.5 分
- issues：只列出 3 个最致命的问题，按严重程度排序
- actions：3 条具体、可立即执行的建议
- summary：客观、专业、有冲击力`;
}
