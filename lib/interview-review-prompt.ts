export interface InterviewReviewResult {
  transcript: string;
  scores: {
    content: number;
    expression: number;
    logic: number;
    overall: number;
  };
  paceAnalysis: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  exampleImprovements: {
    question: string;
    originalAnswer: string;
    improvedAnswer: string;
  }[];
}

export const buildAudioReviewPrompt = (
  jobTitle: string,
  resume: string,
  jobDescription?: string,
  language: 'zh' | 'en' | 'bilingual' = 'zh'
): string => {
  const jdSection = jobDescription ? `\n【岗位 JD】\n${jobDescription}` : '';
  const resumeSection = resume ? `\n【候选人简历】\n${resume}` : '';
  const languageInstruction =
    language === 'en'
      ? 'Return all text fields in English.'
      : language === 'bilingual'
      ? 'Return all text fields in Chinese, but include English translations for key terms.'
      : '全部使用中文';

  return `你是一位有 10 年经验的资深面试教练和人力资源总监。请仔细听这段面试录音，并给出结构化复盘分析。

【目标岗位】${jobTitle}${jdSection}${resumeSection}

请严格按以下 JSON 格式返回，不要包含任何其他说明文字或 Markdown 代码块：

{
  "transcript": "完整的面试对话转录文本，尽量区分面试官和候选人",
  "scores": {
    "content": 7.5,
    "expression": 7.0,
    "logic": 8.0,
    "overall": 7.5
  },
  "paceAnalysis": "对语速、语气、停顿、口头禅、表达流畅度的分析（2-4 句话）",
  "strengths": ["回答亮点1", "回答亮点2"],
  "issues": ["明显问题1", "明显问题2"],
  "suggestions": ["可执行改进建议1", "可执行改进建议2"],
  "exampleImprovements": [
    {
      "question": "面试官提问",
      "originalAnswer": "候选人原回答摘要",
      "improvedAnswer": "更优回答示范"
    }
  ]
}

评分标准：
- content（内容质量）：回答是否切题、是否有案例/数据支撑、是否体现岗位匹配度
- expression（表达质量）：语速是否适中、是否有过多口头禅、是否自信流畅
- logic（逻辑结构）：回答是否有清晰的结构（总分总、STAR 等）
- overall（综合得分）：三项的平均分，精确到 0.5 分

要求：
- ${languageInstruction}
-  transcript 要真实反映录音内容，如果听不清请标注「[听不清]」
- 如果录音中只有候选人单方面的回答，也尽量推断面试官可能的问题
- 保持专业、真诚、有建设性`;
};

export const buildTextReviewPrompt = (
  jobTitle: string,
  messages: { role: 'assistant' | 'user'; content: string }[],
  resume: string,
  jobDescription?: string,
  language: 'zh' | 'en' | 'bilingual' = 'zh'
): string => {
  const jdSection = jobDescription ? `\n【岗位 JD】\n${jobDescription}` : '';
  const resumeSection = resume ? `\n【候选人简历】\n${resume}` : '';
  const dialogue = messages
    .map((m) => `${m.role === 'assistant' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n\n');
  const languageInstruction =
    language === 'en'
      ? 'Return all text fields in English.'
      : language === 'bilingual'
      ? 'Return all text fields in Chinese, but include English translations for key terms.'
      : '全部使用中文';

  return `你是一位有 10 年经验的资深面试教练。请根据以下模拟面试的文字记录，给候选人做结构化复盘分析。

【目标岗位】${jobTitle}${jdSection}${resumeSection}

【面试记录】
${dialogue}

请严格按以下 JSON 格式返回，不要包含任何其他说明文字或 Markdown 代码块：

{
  "transcript": "整理后的面试对话文本（可直接使用原文）",
  "scores": {
    "content": 7.5,
    "expression": 7.0,
    "logic": 8.0,
    "overall": 7.5
  },
  "paceAnalysis": "由于这是文字记录，无法分析语速。请基于表达方式给出分析：用词是否专业、是否啰嗦、是否有冗余词、语气是否得体（2-4 句话）",
  "strengths": ["回答亮点1", "回答亮点2"],
  "issues": ["明显问题1", "明显问题2"],
  "suggestions": ["可执行改进建议1", "可执行改进建议2"],
  "exampleImprovements": [
    {
      "question": "面试官提问",
      "originalAnswer": "候选人原回答摘要",
      "improvedAnswer": "更优回答示范"
    }
  ]
}

评分标准：
- content（内容质量）：回答是否切题、是否有案例/数据支撑、是否体现岗位匹配度
- expression（表达质量）：文字回答是否专业、简洁、得体
- logic（逻辑结构）：回答是否有清晰的结构（总分总、STAR 等）
- overall（综合得分）：三项的平均分，精确到 0.5 分

要求：
- ${languageInstruction}
- 保持专业、真诚、有建设性`;
};
