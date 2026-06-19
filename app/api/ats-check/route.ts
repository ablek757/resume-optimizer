import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkATS } from '@/lib/ats-checker';

const MAX_RESUME_LENGTH = 8000;

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || typeof resume !== 'string' || resume.trim().length === 0) {
      return NextResponse.json({ error: '请输入简历内容' }, { status: 400 });
    }

    if (resume.length > MAX_RESUME_LENGTH) {
      return NextResponse.json(
        { error: `简历内容过长，请控制在 ${MAX_RESUME_LENGTH} 字以内` },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录后再使用', code: 'LOGIN_REQUIRED' },
        { status: 401 }
      );
    }

    const report = checkATS(resume.trim(), jobDescription?.trim());

    return NextResponse.json({ report });
  } catch (error) {
    console.error('ATS check error:', error);
    return NextResponse.json({ error: 'ATS 检测失败，请稍后重试' }, { status: 500 });
  }
}
