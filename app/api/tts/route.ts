import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'Cherry' } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: '请输入需要合成的文本' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录后再使用', code: 'LOGIN_REQUIRED' },
        { status: 401 }
      );
    }

    const apiKey =
      process.env.AUDIO_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      process.env.VISION_API_KEY;
    const baseURL =
      process.env.AUDIO_BASE_URL ||
      process.env.VISION_BASE_URL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = process.env.AUDIO_TTS_MODEL || 'qwen-omni-turbo';

    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 Qwen 语音 API Key', code: 'TTS_NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey, baseURL });

    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: text.trim() }],
      modalities: ['text', 'audio'],
      audio: { voice, format: 'wav' },
      stream: true,
      stream_options: { include_usage: true },
    });

    let transcript = '';
    let audioBase64 = '';

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;
      if (typeof delta.content === 'string' && delta.content) {
        transcript += delta.content;
      }
      const audioDelta = (delta as unknown as { audio?: { data?: string; transcript?: string } }).audio;
      if (audioDelta) {
        if (audioDelta.data) audioBase64 += audioDelta.data;
        if (audioDelta.transcript) transcript += audioDelta.transcript;
      }
    }

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'Qwen 未返回音频数据', transcript },
        { status: 500 }
      );
    }

    return NextResponse.json({ audioBase64, transcript });
  } catch (error) {
    console.error('TTS error:', error);

    let message = '语音合成失败';
    if (error instanceof Error) {
      message = error.message;
      if (message.includes('Insufficient Balance') || message.includes('402')) {
        message = 'Qwen API 余额不足';
      } else if (message.includes('Incorrect API key')) {
        message = 'Qwen API Key 无效';
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
