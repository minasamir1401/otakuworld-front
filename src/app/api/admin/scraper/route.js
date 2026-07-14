import { NextResponse } from 'next/server';
import * as cp from 'child_process';
import fs from 'fs';
import path from 'path';

const configPath = './admin_config.json';

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { username: 'admin', password: 'adminpassword' };
}

function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function getScraperStatus(name) {
  const pidPath = path.resolve(process.cwd(), '../Backend', name + '.pid');
  if (fs.existsSync(pidPath)) {
    try {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
      if (isPidRunning(pid)) {
        return { running: true, pid };
      }
    } catch (e) {}
  }
  return { running: false, pid: null };
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { type } = await request.json();
    let scriptName = '';
    let pidFileName = '';
    let logFileName = '';

    if (type === 'anime') {
      scriptName = 'scraper.js';
      pidFileName = 'anime_scraper';
      logFileName = 'anime_scraper.log';
    } else if (type === 'movies') {
      scriptName = 'scraper_movies.js';
      pidFileName = 'movies_scraper';
      logFileName = 'movies_scraper.log';
    } else if (type === 'sync') {
      scriptName = 'sync_schedule.js';
      pidFileName = 'schedule_sync';
      logFileName = 'schedule_sync.log';
    } else {
      return NextResponse.json({ success: false, error: 'نوع سكربت غير صالح' }, { status: 400 });
    }

    // Check if it's already running
    const status = getScraperStatus(pidFileName);
    if (status.running) {
      return NextResponse.json({ success: false, error: 'هذا السكربت يعمل بالفعل حالياً' }, { status: 400 });
    }

    // Start background process
    const scriptPath = path.resolve(process.cwd(), '../Backend', scriptName);
    const logPath = path.resolve(process.cwd(), '../Backend', logFileName);
    const pidPath = path.resolve(process.cwd(), '../Backend', pidFileName + '.pid');

    const logStream = fs.createWriteStream(logPath, { flags: 'w' }); // Overwrite previous logs
    
    // Spawn script in background with correct cwd
    const child = cp.spawn('node', [path.basename(scriptPath)], {
      cwd: path.dirname(scriptPath),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    child.unref();

    // Write PID file
    fs.writeFileSync(pidPath, String(child.pid), 'utf8');

    return NextResponse.json({ success: true, message: 'تم إطلاق السكربت بنجاح في الخلفية', pid: child.pid });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET route to read last lines of logs
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    let logFileName = '';

    if (type === 'anime') {
      logFileName = 'anime_scraper.log';
    } else if (type === 'movies') {
      logFileName = 'movies_scraper.log';
    } else if (type === 'sync') {
      logFileName = 'schedule_sync.log';
    } else {
      return NextResponse.json({ success: false, error: 'نوع سكربت غير صالح' }, { status: 400 });
    }

    const logPath = path.resolve(process.cwd(), '../Backend', logFileName);
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ success: true, logs: 'لا توجد سجلات بعد لهذا السكربت.' });
    }

    // Read last 100 lines
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    const lastLines = lines.slice(-100).join('\n');

    return NextResponse.json({ success: true, logs: lastLines });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
