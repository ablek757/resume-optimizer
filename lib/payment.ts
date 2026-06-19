import { prisma } from './prisma';

export interface Package {
  name: string;
  price: number;
  type: 'credits' | 'subscription_days';
  value: number;
}

export const DEFAULT_PACKAGES: Package[] = [
  { name: '10 次优化', price: 9.9, type: 'credits', value: 10 },
  { name: '50 次优化', price: 39.9, type: 'credits', value: 50 },
  { name: '月度会员', price: 29.9, type: 'subscription_days', value: 30 },
];

const TOLERANCE = Number(process.env.PAYMENT_TOLERANCE || '0.5');

export function getPackages(): Package[] {
  if (process.env.PAYMENT_PACKAGES) {
    try {
      return JSON.parse(process.env.PAYMENT_PACKAGES) as Package[];
    } catch {
      console.warn('Invalid PAYMENT_PACKAGES env, using default');
    }
  }
  return DEFAULT_PACKAGES;
}

export function matchPackage(amount: number): Package | null {
  const packages = getPackages();
  return (
    packages.find(
      (pkg) => Math.abs(pkg.price - amount) <= TOLERANCE
    ) || null
  );
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createUniqueCode(): Promise<string> {
  let code = generateCode();
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.redemptionCode.findUnique({
      where: { code },
    });
    if (!existing) return code;
    code = generateCode();
    attempts++;
  }

  throw new Error('无法生成唯一兑换码');
}

export async function issueRedemptionCode(
  packageItem: Package
): Promise<{ code: string; id: string }> {
  const code = await createUniqueCode();

  const created = await prisma.redemptionCode.create({
    data: {
      code,
      type: packageItem.type,
      value: packageItem.value,
    },
  });

  return { code: created.code, id: created.id };
}

export async function approveOrder(
  orderId: string,
  packageItem: Package
): Promise<{ success: boolean; code: string; error?: string }> {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false, code: '', error: '订单不存在' };
  }

  if (order.status === 'approved') {
    return { success: false, code: '', error: '订单已处理' };
  }

  const { code, id: codeId } = await issueRedemptionCode(packageItem);

  await prisma.paymentOrder.update({
    where: { id: orderId },
    data: {
      status: 'approved',
      amount: packageItem.price,
      packageName: packageItem.name,
      packageType: packageItem.type,
      packageValue: packageItem.value,
      redemptionCodeId: codeId,
      notes: '自动审核通过',
    },
  });

  return { success: true, code };
}

export function validateScreenshotSize(base64: string, maxBytes: number = 2 * 1024 * 1024): boolean {
  // base64 字符串大小 ≈ 原图大小 * 1.37
  const sizeInBytes = Buffer.byteLength(base64, 'base64');
  return sizeInBytes <= maxBytes;
}
