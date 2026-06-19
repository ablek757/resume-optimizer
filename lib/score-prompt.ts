export const buildScorePrompt = (
  jobTitle: string,
  resume: string,
  jobDescription?: string
): string => {
  const jdSection = jobDescription
    ? `\n【目标岗位 JD】\n${jobDescription}`
    : '';

  return `你是一位资深 HR 总监和 ATS 优化专家。请根据目标岗位和简历内容，对简历进行客观评分，并给出 JD 匹配度分析。

【目标岗位】
${jobTitle}${jdSection}

【简历内容】
${resume}

请严格按以下 JSON 格式返回，不要包含任何其他说明文字或 Markdown 代码块：

{
  "score": 7.5,
  "matchPercentage": 68,
  "summary": "2-3 句话的整体评价",
  "keywords": [
    { "word": "关键词1", "matched": true, "suggestion": "" },
    { "word": "关键词2", "matched": false, "suggestion": "建议补充该关键词相关经历" }
  ],
  "suggestions": [
    "具体改进建议1",
    "具体改进建议2",
    "具体改进建议3"
  ]
}

要求：
- score：1-10 分，精确到 0.5 分
- matchPercentage：0-100 的整数，表示与 JD 的匹配程度（没有 JD 时按目标岗位通用要求评估）
- keywords：5-8 个目标岗位高频关键词，标明是否已在简历中体现
- suggestions：3-5 条具体、可执行的改进建议
- summary：客观、专业、有建设性`;
};
