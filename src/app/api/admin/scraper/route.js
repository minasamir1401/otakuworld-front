import { NextResponse } from 'next/server';
import fs from 'fs';

const configPath = './admin_config.json';
// URL of the Backend container (set BACKEND_URL env var in Dokploy)
let BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
if (BACKEND_URL && !BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
  BACKEND_URL = 'https://' + BACKEND_URL;
}
const BACKEND_SECRET = process.env.BACKEND_SECRET || 'otakuworld-secret-2025';


function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { username: 'admin', password: 'adminpassword' };
}

function checkAuth(request) {
  const config = readConfig();
  const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${currentToken}`;
}

// POST /api/admin/scraper  { type: 'anime'|'movies'|'sync' }
export async function POST(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
  }

  try {
    const { type } = await request.json();

    const res = await fetch(`${BACKEND_URL}/scraper/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKEND_SECRET}`
      },
      body: JSON.stringify({ type })
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `تعذر الاتصال بسيرفر الباك إند: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET /api/admin/scraper?type=anime|movies|sync
export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const res = await fetch(`${BACKEND_URL}/scraper/logs?type=${type}`, {
      headers: { 'Authorization': `Bearer ${BACKEND_SECRET}` }
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `تعذر الاتصال بسيرفر الباك إند: ${error.message}` },
      { status: 500 }
    );
  }
}
