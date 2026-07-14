const fs = require('fs');
const path = require('path');
const src = 'c:/Users/Administrator/Desktop/anm/FRONT END/src/app/anime/[slug]/page.js';
const destDir = 'c:/Users/Administrator/Desktop/anm/FRONT END/src/app/show/[slug]';
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
let code = fs.readFileSync(src, 'utf8');

code = code.replace(/أنمي/g, 'عمل');
code = code.replace(/الأنمي/g, 'العمل');
// Update component name if it was AnimePage to ShowPage etc
code = code.replace(/Anime/g, 'Show');
code = code.replace(/anime/g, 'show');

fs.writeFileSync(path.join(destDir, 'page.js'), code);
