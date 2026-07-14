const { execSync } = require('child_process');

if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL) {
  console.log('🚀 Vercel build environment detected. Running database schema push and migration during build...');
  try {
    console.log('Prisma generate client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('Prisma database push...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('Running database import...');
    execSync('node db_import.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Database migration failed during Vercel build:', err.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Standard build environment. Skipping build-time database push/import (will run at runtime).');
}
