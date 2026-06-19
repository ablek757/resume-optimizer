import { prisma } from './prisma';

const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || '3');

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  dailyFreeUses: number;
  credits: number;
  hasSubscription: boolean;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function hasActiveSubscription(subscriptionEndsAt: Date | null): boolean {
  if (!subscriptionEndsAt) return false;
  return new Date(subscriptionEndsAt) > new Date();
}

export async function checkQuota(userId: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { allowed: false, reason: '用户不存在', dailyFreeUses: 0, credits: 0, hasSubscription: false };
  }

  // 会员有效期内无限次
  if (hasActiveSubscription(user.subscriptionEndsAt)) {
    return {
      allowed: true,
      dailyFreeUses: user.dailyFreeUses,
      credits: user.credits,
      hasSubscription: true,
    };
  }

  // 检查 credits
  if (user.credits > 0) {
    return {
      allowed: true,
      dailyFreeUses: user.dailyFreeUses,
      credits: user.credits,
      hasSubscription: false,
    };
  }

  // 检查每日免费次数
  const today = getTodayString();
  let dailyFreeUses = user.dailyFreeUses;

  if (user.lastFreeUseDate !== today) {
    dailyFreeUses = 0;
  }

  if (dailyFreeUses < FREE_DAILY_LIMIT) {
    return {
      allowed: true,
      dailyFreeUses,
      credits: user.credits,
      hasSubscription: false,
    };
  }

  return {
    allowed: false,
    reason: `今日免费次数已用完（每天 ${FREE_DAILY_LIMIT} 次），请购买额度或兑换会员`,
    dailyFreeUses,
    credits: user.credits,
    hasSubscription: false,
  };
}

export async function deductQuota(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error('用户不存在');

  // 会员有效期内不扣额度
  if (hasActiveSubscription(user.subscriptionEndsAt)) {
    return;
  }

  // 优先扣 credits
  if (user.credits > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });
    return;
  }

  // 扣每日免费次数
  const today = getTodayString();
  const isNewDay = user.lastFreeUseDate !== today;

  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyFreeUses: isNewDay ? 1 : { increment: 1 },
      lastFreeUseDate: today,
    },
  });
}

export async function redeemCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
  const redemptionCode = await prisma.redemptionCode.findUnique({
    where: { code },
  });

  if (!redemptionCode) {
    return { success: false, message: '兑换码不存在' };
  }

  if (redemptionCode.usedBy) {
    return { success: false, message: '兑换码已被使用' };
  }

  if (redemptionCode.expiresAt && new Date(redemptionCode.expiresAt) < new Date()) {
    return { success: false, message: '兑换码已过期' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, message: '用户不存在' };
  }

  await prisma.$transaction(async (tx) => {
    if (redemptionCode.type === 'credits') {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: redemptionCode.value } },
      });
    } else if (redemptionCode.type === 'subscription_days') {
      const now = new Date();
      const currentEnd = hasActiveSubscription(user.subscriptionEndsAt)
        ? new Date(user.subscriptionEndsAt!)
        : now;
      const newEnd = new Date(currentEnd.getTime() + redemptionCode.value * 24 * 60 * 60 * 1000);

      await tx.user.update({
        where: { id: userId },
        data: { subscriptionEndsAt: newEnd },
      });
    }

    await tx.redemptionCode.update({
      where: { id: redemptionCode.id },
      data: {
        usedBy: userId,
        usedAt: new Date(),
      },
    });
  });

  const valueText = redemptionCode.type === 'credits'
    ? `${redemptionCode.value} 次优化额度`
    : `${redemptionCode.value} 天会员`;

  return { success: true, message: `兑换成功，获得 ${valueText}` };
}
