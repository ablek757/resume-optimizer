const fs = require('fs');
const path = require('path');

if (process.env.VERCEL === '1') {
  const source = path.join(process.cwd(), 'prisma', 'schema.postgresql.prisma');
  const target = path.join(process.cwd(), 'prisma', 'schema.prisma');
  fs.copyFileSync(source, target);
  console.log('Copied PostgreSQL schema for Vercel build');
}
