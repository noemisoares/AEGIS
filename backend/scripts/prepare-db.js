const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

console.log(`[DB Setup] Database URL protocol: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);

let updatedContent;
if (isPostgres) {
  updatedContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
} else {
  updatedContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
}

if (updatedContent !== schemaContent) {
  fs.writeFileSync(schemaPath, updatedContent, 'utf8');
  console.log(`[DB Setup] Updated schema.prisma provider to: ${isPostgres ? 'postgresql' : 'sqlite'}`);
}

try {
  console.log('[DB Setup] Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (err) {
  console.error('[DB Setup] Error generating client:', err.message);
  process.exit(1);
}
