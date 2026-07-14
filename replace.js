const fs = require('fs');
const path = require('path');
const src = 'c:/Users/Administrator/Desktop/anm/FRONT END/src/app/category/[type]/page.js';
const destDir = 'c:/Users/Administrator/Desktop/anm/FRONT END/src/app/shows/[type]';
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
let code = fs.readFileSync(src, 'utf8');

code = code.replace(/setAnimes/g, 'setShows');
code = code.replace(/animes/g, 'shows');
code = code.replace(/fetchAnimes/g, 'fetchShows');
code = code.replace(/anime/g, 'show');
code = code.replace(/Anime/g, 'Show');
// Fix the API payload parsing
code = code.replace(/data\.shows/g, 'data.animes');
// It will now say href={`/show/${show.slug}`} which is what we want.

fs.writeFileSync(path.join(destDir, 'page.js'), code);
