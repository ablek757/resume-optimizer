export const buildJDRewritePrompt = (
  jobTitle: string,
  resume: string,
  jobDescription: string,
  language: 'zh' | 'en' | 'bilingual' = 'zh'
): string => {
  const languageInstruction =
    language === 'en'
      ? 'Return all text fields in English.'
      : language === 'bilingual'
      ? 'Return rewrittenResume in bilingual format: Chinese first, then English translation for each item. Other fields in Chinese.'
      : '全部使用中文';

  return `你是一位资深猎头顾问和 ATS 优化专家。请根据目标岗位 JD，对原始简历进行"关键词对齐改写"：在不编造经历、不虚构数据的前提下，把简历里的描述向 JD 的高频关键词、能力要求靠拢，提高 ATS 筛选通过率。

【目标岗位】
${jobTitle}

【岗位 JD】
${jobDescription}

【原始简历】
${resume}

请严格按以下 JSON 格式返回，不要包含任何其他说明文字或 Markdown 代码块：

{
  "rewrittenResume": "改写后的完整简历 Markdown 文本，结构清晰、可直接复制使用",
  "addedKeywords": ["新增融入的关键词1", "新增融入的关键词2"],
  "removedKeywords": ["被弱化/替换的关键词1"],
  "matchedKeywords": ["原本已匹配的关键词1", "原本已匹配的关键词2"],
  "matchPercentage": 78,
  "suggestions": ["具体可执行的后续优化建议1", "建议2"]
}

要求：
- ${languageInstruction}
- rewrittenResume 必须包含：个人信息、教育背景、工作经历、项目经历（如有）、技能/证书等模块
- 使用 STAR 法则和 bullet points，尽量量化成果；没有数据的标注「待补充」
- addedKeywords：从 JD 中提取、在改写后明显得到加强的高频关键词（3-8 个）
- matchedKeywords：原始简历中已出现、JD 也看重，改写后保留的关键词（3-8 个）
- removedKeywords：原简历有但 JD 不关注、改写后弱化或替换的表述（0-5 个）
- matchPercentage：改写后与 JD 的预估匹配度，0-100 的整数
- suggestions：3-5 条具体建议，如补充某类项目经历、考取某证书、调整岗位关键词等`;
};
