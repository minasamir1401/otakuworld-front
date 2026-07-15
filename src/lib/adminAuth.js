import prisma from '@/lib/db';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

export async function getAdminConfig() {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
    return config || { username: ADMIN_USERNAME, password: ADMIN_PASSWORD };
  } catch (e) {
    console.error('Error reading AppConfig from DB:', e.message);
    return { username: ADMIN_USERNAME, password: ADMIN_PASSWORD };
  }
}
