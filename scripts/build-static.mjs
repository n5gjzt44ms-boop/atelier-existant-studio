// Build statique (sans serveur) : la route /api/pdf (Puppeteer) est mise de côté
// le temps du build, puis restaurée. L'export PDF se fait alors via l'impression navigateur.
import { renameSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const api = 'app/api', parked = '.api-parked';
if (existsSync(api)) renameSync(api, parked);
try {
  execSync('next build', { stdio: 'inherit', env: { ...process.env, STATIC_EXPORT: '1' } });
} finally {
  if (existsSync(parked)) renameSync(parked, api);
}

// Avec assetPrefix './', les url() des CSS doivent être relatives au fichier CSS lui-même
const cssDir = 'out/_next/static/css';
for (const f of existsSync(cssDir) ? readdirSync(cssDir) : []) {
  const p = `${cssDir}/${f}`;
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('url(_next/static/media/', 'url(../media/'));
}
