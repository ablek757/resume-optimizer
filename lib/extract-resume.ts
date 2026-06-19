export function extractOptimizedResume(content: string): string {
  // 匹配 "## 二、优化版简历" 到下一个 "## " 二级标题之间的内容
  const match = content.match(
    /##\s*二、优化版简历\s*\n([\s\S]*?)(?=\n##\s|$)/
  );

  if (!match) return '';

  return match[1].trim();
}
