import { NextResponse } from 'next/server';
import * as cp from 'child_process';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';

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

function getMigrationStatus() {
  const pidPath = path.resolve(process.cwd(), '../Backend', 'migration_db.pid');
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

    // Check if migration data file exists
    const dataPath = path.resolve(process.cwd(), '../Backend', 'migration_data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ 
        success: false, 
        error: 'ملف البيانات migration_data.json غير موجود في مجلد Backend. يرجى رفعه أولاً.' 
      }, { status: 400 });
    }

    // Check if migration is already running
    const status = getMigrationStatus();
    if (status.running) {
      return NextResponse.json({ success: false, error: 'عملية نقل البيانات تعمل بالفعل حالياً' }, { status: 400 });
    }

    // Define script and log paths
    const scriptPath = path.resolve(process.cwd(), '../Backend', 'db_import.js');
    const logPath = path.resolve(process.cwd(), '../Backend', 'migration_db.log');
    const pidPath = path.resolve(process.cwd(), '../Backend', 'migration_db.pid');

    const logStream = fs.createWriteStream(logPath, { flags: 'w' }); // Overwrite previous logs
    
    // Spawn script in background
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

    return NextResponse.json({ 
      success: true, 
      message: 'تم إطلاق عملية استيراد البيانات بنجاح في الخلفية على الخادم', 
      pid: child.pid 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET route to read last lines of logs and check status
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    const status = getMigrationStatus();
    const logPath = path.resolve(process.cwd(), '../Backend', 'migration_db.log');
    let logs = 'لا توجد سجلات بعد لعملية النقل.';

    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n');
      logs = lines.slice(-100).join('\n');
    }

    return NextResponse.json({ 
      success: true, 
      running: status.running, 
      pid: status.pid, 
      logs 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const config = readConfig();
    const currentToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول' }, { status: 403 });
    }

    console.log('🗑️ Wiping all anime data from PostgreSQL...');
    
    // Delete in order to satisfy foreign key constraints
    await prisma.visit.deleteMany();
    await prisma.videoServer.deleteMany();
    await prisma.downloadLink.deleteMany();
    await prisma.episode.deleteMany();
    await prisma.season.deleteMany();
    await prisma.anime.deleteMany();

    console.log('✅ All anime data deleted successfully!');

    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف جميع الأنميات والبيانات وقاعدة البيانات بالكامل بنجاح!' 
    });
  } catch (error) {
    console.error('Failed to wipe database:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
