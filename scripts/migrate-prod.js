const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set.');
  console.error('Please run with: DATABASE_URL=your_vercel_postgres_url npm run migrate:prod');
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const pgSchemaPath = path.join(process.cwd(), 'prisma', 'schema.postgresql.prisma');
const backupPath = path.join(process.cwd(), 'prisma', 'schema.prisma.local.backup');

console.log('Switching to PostgreSQL schema for migration...');
fs.copyFileSync(schemaPath, backupPath);
fs.copyFileSync(pgSchemaPath, schemaPath);

try {
  console.log('Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  console.log('Restoring local SQLite schema...');
  fs.copyFileSync(backupPath, schemaPath);
  fs.unlinkSync(backupPath);
}
