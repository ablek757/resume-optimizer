: # AI 简历优化

基于 DeepSeek/Kimi AI 的智能简历优化工具，帮助求职者按目标岗位优化简历内容，生成修改建议、匹配度评分和面试预测题。

## 功能

- 📝 按目标岗位定制优化简历
- 🎯 可选粘贴岗位 JD，让优化更精准
- 📄 支持上传 PDF 简历，自动提取文字
- 🖼️ 支持上传图片简历 OCR（需配置视觉模型）
- 🔐 邮箱登录 + 每日免费次数 + 兑换码充值/会员
- 📊 自动给出匹配度评分
- 💬 预测面试问题并提供回答思路
- ✨ Markdown 格式结果，清晰易读

## 技术栈

- Next.js 16 + TypeScript
- Tailwind CSS
- Prisma + SQLite/PostgreSQL
- JWT 邮箱验证码登录
- DeepSeek / Kimi API (OpenAI 兼容接口)
- pdf2json（PDF 文字提取）
- react-markdown

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npx prisma migrate dev
```

### 3. 配置环境变量

在项目根目录创建 `.env.local` 文件，完整示例见 `SETUP.md`：

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-random-secret-key

AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat

# 图片 OCR（可选）
VISION_API_KEY=your_qwen_api_key_here
VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VISION_MODEL=qwen-vl-plus
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 即可使用。

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 切换为 PostgreSQL schema：
   ```bash
   cp prisma/schema.postgresql.prisma prisma/schema.prisma
   ```
4. 准备 PostgreSQL 数据库（推荐 [Supabase](https://supabase.com/)）
5. 在 Vercel 的 Environment Variables 中添加：
   - `DATABASE_URL`（Supabase PostgreSQL 连接字符串）
   - `JWT_SECRET`
   - `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`
   - `VISION_API_KEY`、`VISION_BASE_URL`、`VISION_MODEL`（图片 OCR 可选）
   - `RESEND_API_KEY`、`FROM_EMAIL`（生产环境邮件）
6. 在 Vercel 的 Build Command 中执行迁移：
   ```bash
   npx prisma migrate deploy && npm run build
   ```
7. 点击 Deploy

> 注意：Vercel 上 SQLite 无法持久化，生产环境必须使用 PostgreSQL。

## 项目结构

```
app/
  api/optimize/route.ts       # 简历优化接口（含额度检查）
  api/extract-text/route.ts   # PDF/图片文字提取接口
  api/auth/send-code/route.ts # 发送登录验证码
  api/auth/verify-code/route.ts # 验证验证码并登录
  api/auth/me/route.ts        # 获取当前用户信息
  api/auth/logout/route.ts    # 退出登录
  api/redeem/route.ts         # 兑换码兑换
  page.tsx                    # 主页面
  layout.tsx                  # 根布局
  globals.css                 # 全局样式
components/
  markdown-renderer.tsx       # Markdown 结果渲染组件
  auth-modal.tsx              # 登录弹窗
lib/
  prisma.ts                   # Prisma 客户端
  auth.ts                     # JWT 认证工具
  email.ts                    # 邮件发送
  quota.ts                    # 额度检查与扣除
  prompt.ts                   # 简历优化 Prompt
  mock-response.ts            # Mock 模式示例结果
prisma/
  schema.prisma               # 数据库模型
```

## 变现模式

当前采用**兑换码模式**：
- 新用户每天免费 3 次
- 用户扫码付款后，你手动发放兑换码
- 兑换码类型：
  - `credits`：抵扣优化次数
  - `subscription_days`：开通会员，有效期内无限次

后续可升级为 Stripe / 微信 / 支付宝自动支付。

## 下一步可扩展

- [x] 接入用户登录和使用次数限制
- [x] 接入兑换码支付系统
- [ ] 接入 Stripe / 微信 / 支付宝自动支付
- [ ] 简历模板下载功能
- [ ] 收集用户反馈和优化 Prompt
- [ ] 后台管理面板（查看用户、创建兑换码）
