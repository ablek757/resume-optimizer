# 部署到 Vercel

## 1. 创建 Vercel Postgres 数据库

- 访问 https://vercel.com/dashboard
- 进入 **Storage** 标签
- 点击 **Create Database** → 选择 **Postgres**
- 创建成功后，复制 `POSTGRES_URL`（或 `DATABASE_URL`）

## 2. 部署项目

- 访问 https://vercel.com/new
- 选择 GitHub 仓库 `ablek757/resume-optimizer`
- **Framework Preset** 选 **Next.js**
- 展开 **Environment Variables**，粘贴以下内容
- 把 `YOUR_VERCEL_POSTGRES_URL` 替换为你复制的 Postgres URL

```env
DATABASE_URL=YOUR_VERCEL_POSTGRES_URL
JWT_SECRET=b5855bb98f29e3931ec31f7a7908ff97dfbc2b21433cbe608d1df2d05ec4b358
AI_API_KEY=sk-fac685cab00345ec8d00b249018bec53
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
VISION_API_KEY=sk-d7ba1a46d92f46c8a0aaa898a6e26859
VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VISION_MODEL=qwen-vl-plus
ADMIN_PASSWORD=yD6B4dL9SfdC2hJ8RgEw
```

- 点击 **Deploy**

## 3. 运行数据库迁移

部署完成后，在本地运行以下命令创建线上数据库表：

```bash
cd resume-optimizer

# 临时使用 PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 运行迁移（需要设置 DATABASE_URL 为你的 Vercel Postgres URL）
DATABASE_URL=YOUR_VERCEL_POSTGRES_URL npx prisma migrate deploy

# 恢复本地 SQLite schema
git checkout prisma/schema.prisma
```

把 `YOUR_VERCEL_POSTGRES_URL` 换成你的 Vercel Postgres URL。

## 4. 验证

- 访问 Vercel 分配的域名
- 测试邮箱登录、简历优化、购买额度流程
- 访问 `/admin` 用 `ADMIN_PASSWORD` 登录查看后台
