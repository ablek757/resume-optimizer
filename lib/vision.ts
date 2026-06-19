import OpenAI from 'openai';

export async function recognizePaymentScreenshot(
  base64Image: string,
  mimeType: string = 'image/png'
): Promise<{ amount: number | null; text: string }> {
  const apiKey = process.env.VISION_API_KEY || process.env.AI_API_KEY;
  const baseURL = process.env.VISION_BASE_URL || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.VISION_MODEL || 'moonshot-v1-8k-vision-preview';

  if (!apiKey) {
    throw new Error('未配置图片 OCR 所需的 API Key');
  }

  if (baseURL.includes('deepseek.com') && !process.env.VISION_BASE_URL) {
    throw new Error('DeepSeek 暂不支持图片 OCR，请配置 VISION_BASE_URL');
  }

  const client = new OpenAI({ apiKey, baseURL });
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `这是一张微信支付/转账/收款截图。请识别图中的支付金额（元），并返回 JSON 格式：
{"amount": 数字或 null, "text": "你看到的所有关键文字"}
注意：
- amount 只填用户实际支付的金额数字（如 9.9、39.9），不要带单位。
- 如果无法确定金额，amount 填 null。
- text 填你识别到的主要文字内容，用于人工复核。`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('OCR 未返回内容');
  }

  // 尝试从返回内容中解析 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
        text: String(parsed.text || content),
      };
    } catch {
      // fallback
    }
  }

  // 兜底：尝试从文本中提取金额数字
  const amountMatch = content.match(/(\d+(?:\.\d+)?)\s*[元¥]/);
  return {
    amount: amountMatch ? Number(amountMatch[1]) : null,
    text: content,
  };
}
