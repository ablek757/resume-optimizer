export interface SectionScore {
  name: string;
  score: number;
  max: number;
  weight: number;
  issues: string[];
  suggestions: string[];
}

export interface KeywordMatch {
  word: string;
  matched: boolean;
  count: number;
}

export interface ATSReport {
  overallScore: number;
  parserFriendlyScore: number;
  sectionScores: SectionScore[];
  keywordMatches: KeywordMatch[];
  readability: {
    lengthOk: boolean;
    bulletUsage: number;
    quantifiedRatio: number;
    hasContact: boolean;
    hasDates: boolean;
  };
  issues: string[];
  suggestions: string[];
}

const SECTION_KEYWORDS: Record<string, string[]> = {
  personal: ['个人信息', '联系方式', '电话', '邮箱', '姓名', '手机'],
  education: ['教育', '学历', '学校', '大学', '学院', '本科', '硕士', '博士', '专业'],
  work: ['工作经历', '工作经验', '实习', '任职', '公司', '职位', '岗位', '负责', '主导'],
  projects: ['项目经历', '项目经验', '项目', '项目描述'],
  skills: ['技能', '技术栈', '证书', '语言能力', '熟练', '掌握', '熟悉'],
};

const STOP_WORDS = new Set([
  '的', '了', '和', '是', '在', '有', '我', '都', '个', '与', '也', '对', '为', '能', '很', '可以', '就', '不', '会', '要', '没有', '我们', '这', '上', '他', '而', '及', '与', '或', '等', '以及', '以下', '以上', '一种', '一个', 'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
]);

function detectSections(text: string): Record<string, { exists: boolean; lines: number; startLine: number }> {
  const lines = text.split('\n');
  const sections: Record<string, { exists: boolean; lines: number; startLine: number }> = {};

  for (const [key, keywords] of Object.entries(SECTION_KEYWORDS)) {
    let startLine = -1;
    let lineCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some((k) => line.includes(k))) {
        if (startLine === -1) startLine = i;
        lineCount++;
      }
    }
    sections[key] = { exists: startLine !== -1, lines: lineCount, startLine };
  }

  return sections;
}

function extractJDKeywords(jd: string): string[] {
  // Simple extraction: split by non-word chars, filter stop words and short tokens
  const tokens = jd
    .split(/[^\u4e00-\u9fa5a-zA-Z0-9+#.\/]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !STOP_WORDS.has(t));

  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
}

function countBulletLines(text: string): number {
  const lines = text.split('\n');
  return lines.filter((l) => /^\s*[-•*·]\s+/.test(l) || /^\s*\d+[.．、]\s*/.test(l)).length;
}

function countQuantifiedLines(text: string): number {
  const lines = text.split('\n');
  return lines.filter(
    (l) =>
      /\d+%/.test(l) ||
      /\d+\s*[万千万亿]/.test(l) ||
      /\d+\s*(个|次|人|天|月|年|项|款|条)/.test(l) ||
      /提升|提高|降低|增长|减少|增加.*\d+/.test(l)
  ).length;
}

function hasPhone(text: string): boolean {
  return /1[3-9]\d{9}|\d{3,4}-\d{7,8}/.test(text);
}

function hasEmail(text: string): boolean {
  return /[\w.-]+@[\w.-]+\.\w+/.test(text);
}

function hasDates(text: string): boolean {
  return /(19|20)\d{2}\s*[.-/年]\s*(\d{1,2}|至今|present)/i.test(text);
}

export function checkATS(resume: string, jobDescription?: string): ATSReport {
  const text = resume.trim();
  const lines = text.split('\n').filter((l) => l.trim());
  const sections = detectSections(text);

  const totalLines = lines.length;
  const bulletLines = countBulletLines(text);
  const quantifiedLines = countQuantifiedLines(text);
  const contactOk = hasPhone(text) && hasEmail(text);
  const datesOk = hasDates(text);
  const lengthOk = text.length >= 200 && text.length <= 8000;

  // Section scores
  const sectionScores: SectionScore[] = [];

  // Personal info
  const personalScore = sections.personal.exists || contactOk ? 8 : 4;
  sectionScores.push({
    name: '个人信息',
    score: personalScore,
    max: 10,
    weight: 10,
    issues: contactOk ? [] : ['未识别到手机号或邮箱'],
    suggestions: contactOk ? [] : ['确保简历顶部包含手机号和邮箱'],
  });

  // Format
  const formatIssues: string[] = [];
  const formatSuggestions: string[] = [];
  if (!lengthOk) formatIssues.push(text.length < 200 ? '简历内容过短' : '简历内容过长');
  if (bulletLines < totalLines * 0.2) {
    formatIssues.push('缺少 bullet points，大段文字不利于 ATS 解析');
    formatSuggestions.push('将经历拆分为带有项目符号的短句');
  }
  if (text.includes('table') || text.includes('|')) {
    formatIssues.push('检测到表格符号，部分 ATS 无法正确解析表格');
    formatSuggestions.push('避免使用表格、分栏或复杂排版');
  }
  const formatScore = Math.max(0, 20 - formatIssues.length * 5);
  sectionScores.push({
    name: '格式与排版',
    score: formatScore,
    max: 20,
    weight: 20,
    issues: formatIssues,
    suggestions: formatSuggestions,
  });

  // Work experience
  const workIssues: string[] = [];
  const workSuggestions: string[] = [];
  if (!sections.work.exists) {
    workIssues.push('未识别到工作经历模块');
    workSuggestions.push('添加「工作经历」或「实习经历」模块');
  }
  const workText = text
    .split('\n')
    .slice(sections.work.startLine, sections.work.startLine + 40)
    .join('\n');
  const workQuantified = countQuantifiedLines(workText);
  const workBullet = countBulletLines(workText);
  if (workBullet > 0 && workQuantified / workBullet < 0.3) {
    workIssues.push('工作经历中量化成果偏少');
    workSuggestions.push('用数字描述成果，例如提升 30%、服务 100 万用户等');
  }
  if (!datesOk) {
    workIssues.push('未识别到统一的时间格式');
    workSuggestions.push('使用 2020.06 - 2022.08 这类清晰的时间格式');
  }
  const workScore = Math.max(0, 30 - workIssues.length * 8);
  sectionScores.push({
    name: '工作经历',
    score: workScore,
    max: 30,
    weight: 30,
    issues: workIssues,
    suggestions: workSuggestions,
  });

  // Education
  const eduScore = sections.education.exists ? 10 : 3;
  sectionScores.push({
    name: '教育背景',
    score: eduScore,
    max: 10,
    weight: 10,
    issues: sections.education.exists ? [] : ['未识别到教育背景模块'],
    suggestions: sections.education.exists ? [] : ['添加学校、专业、学历、时间等教育信息'],
  });

  // Skills
  const skillIssues: string[] = [];
  const skillSuggestions: string[] = [];
  if (!sections.skills.exists) {
    skillIssues.push('未识别到技能模块');
    skillSuggestions.push('添加「技能」或「技术栈」模块，列出与岗位相关的硬技能');
  }
  const skillScore = sections.skills.exists ? 12 : 5;
  sectionScores.push({
    name: '技能与证书',
    score: skillScore,
    max: 15,
    weight: 15,
    issues: skillIssues,
    suggestions: skillSuggestions,
  });

  // Keywords
  let keywordMatches: KeywordMatch[] = [];
  let keywordScore = 0;
  if (jobDescription && jobDescription.trim()) {
    const keywords = extractJDKeywords(jobDescription);
    keywordMatches = keywords.map((word) => {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      return { word, matched: !!matches && matches.length > 0, count: matches ? matches.length : 0 };
    });
    const matchedCount = keywordMatches.filter((k) => k.matched).length;
    keywordScore = Math.round((matchedCount / Math.max(1, keywordMatches.length)) * 15);
  } else {
    keywordScore = 8; // neutral if no JD
  }
  sectionScores.push({
    name: 'JD 关键词匹配',
    score: keywordScore,
    max: 15,
    weight: 15,
    issues: [],
    suggestions: jobDescription
      ? keywordMatches
          .filter((k) => !k.matched)
          .slice(0, 5)
          .map((k) => `建议在简历中补充「${k.word}」相关经历`)
      : ['粘贴岗位 JD 可获得更精准的关键词匹配分析'],
  });

  // Overall
  const overallScore = Math.round(
    sectionScores.reduce((sum, s) => sum + (s.score / s.max) * s.weight, 0)
  );

  // Parser friendly score (weighted on format + structure)
  const parserFriendlyScore = Math.round(
    ((formatScore / 20) * 0.5 + (personalScore / 10) * 0.2 + (eduScore / 10) * 0.15 + (workScore / 30) * 0.15) * 100
  );

  const issues = sectionScores.flatMap((s) => s.issues).filter(Boolean);
  const suggestions = sectionScores.flatMap((s) => s.suggestions).filter(Boolean);

  return {
    overallScore,
    parserFriendlyScore,
    sectionScores,
    keywordMatches,
    readability: {
      lengthOk,
      bulletUsage: totalLines > 0 ? Math.round((bulletLines / totalLines) * 100) : 0,
      quantifiedRatio: totalLines > 0 ? Math.round((quantifiedLines / totalLines) * 100) : 0,
      hasContact: contactOk,
      hasDates: datesOk,
    },
    issues: issues.slice(0, 8),
    suggestions: suggestions.slice(0, 8),
  };
}
