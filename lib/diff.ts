export interface DiffLine {
  type: 'equal' | 'add' | 'remove' | 'change';
  left?: string;
  right?: string;
}

export function computeLineDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');

  const m = leftLines.length;
  const n = rightLines.length;

  // Longest common subsequence length matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      result.unshift({ type: 'equal', left: leftLines[i - 1], right: rightLines[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', right: rightLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'remove', left: leftLines[i - 1] });
      i--;
    } else {
      break;
    }
  }

  // Merge adjacent remove + add into a change pair for clearer display
  const merged: DiffLine[] = [];
  for (let k = 0; k < result.length; k++) {
    const curr = result[k];
    const next = result[k + 1];
    if (curr.type === 'remove' && next?.type === 'add') {
      merged.push({ type: 'change', left: curr.left, right: next.right });
      k++;
    } else {
      merged.push(curr);
    }
  }

  return merged;
}
