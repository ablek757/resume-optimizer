: # 环境变量配置

在项目根目录创建 `.env.local` 文件，填入以下内容。

## 基础配置（必填）

```env
# 数据库（本地开发用 SQLite）
DATABASE_URL="file:./dev.db"

# JWT 密钥（生产环境请换成随机强密码）
JWT_SECRET=your-random-secret-key-here

# 简历优化 AI（DeepSeek）
AI_API_KEY=your_deepseek_api_key_here
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

## 生产环境切换 PostgreSQL

Vercel 等 Serverless 平台无法持久化 SQLite，生产环境需要 PostgreSQL（推荐 Supabase）。

### 1. 注册 Supabase

访问 https://supabase.com/ 创建项目。

### 2. 获取连接字符串

在 Supabase 项目设置 → Database → Connection string → URI 中复制，格式类似：

```
postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
```

### 3. 切换 Prisma schema

```bash
# 复制 PostgreSQL schema 覆盖默认 schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 重新生成客户端并迁移
npx prisma generate
npx prisma migrate deploy
```

### 4. 设置环境变量

将 Supabase 的连接字符串设置为 `DATABASE_URL`。

> 注意：Supabase 默认需要 `pgbouncer=true` 或 `connection_limit=1`，连接字符串示例：
> `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1`

## 图片 OCR 配置（可选）

DeepSeek 暂不支持图片输入。如需上传图片简历，请配置一个支持视觉的模型：

### 使用通义千问 Qwen（推荐，国内可用）

```env
VISION_API_KEY=your_qwen_api_key_here
VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VISION_MODEL=qwen-vl-plus
```

### 使用 Kimi 视觉模型

```env
VISION_API_KEY=your_kimi_api_key_here
VISION_BASE_URL=https://api.moonshot.cn/v1
VISION_MODEL=moonshot-v1-8k-vision-preview
```

### 使用 Gemini

```env
VISION_API_KEY=your_gemini_api_key_here
VISION_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
VISION_MODEL=gemini-2.0-flash-exp
```

### 使用 Claude

```env
VISION_API_KEY=your_anthropic_api_key_here
VISION_BASE_URL=https://api.anthropic.com/v1/
VISION_MODEL=claude-3-haiku-20240307
```

## 邮件配置（可选）

登录验证码默认使用测试模式（验证码会打印在控制台）。生产环境请配置 Resend：

```env
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=your@email.com
```

> 如果没有配置 Resend，系统会打印验证码到控制台，前端弹窗也会显示验证码（仅限测试）。

## Mock 模式（无 API Key 也能预览）

如果暂时没有 API Key 或余额不足，可以开启 Mock 模式预览页面效果：

```env
MOCK_MODE=true
```

开启后，系统会返回一份固定的示例优化结果，不调用真实 AI API。

## 免费额度配置

默认每天免费 3 次。可通过环境变量修改：

```env
FREE_DAILY_LIMIT=5
```

## 创建兑换码

管理员可以通过 Prisma Studio 或脚本创建兑换码：

```bash
npx prisma studio
```

或在 `RedemptionCode` 表中插入数据：

```sql
-- 10 次优化额度
INSERT INTO RedemptionCode (id, code, type, value, createdAt)
VALUES ('c1', 'BUY10', 'credits', 10, datetime('now'));

-- 30 天会员
INSERT INTO RedemptionCode (id, code, type, value, createdAt)
VALUES ('c2', 'VIP30', 'subscription_days', 30, datetime('now'));
```

兑换码类型说明：
- `credits`：抵扣优化次数，value 为次数
- `subscription_days`：开通会员，value 为天数，会员有效期内无限次使用
