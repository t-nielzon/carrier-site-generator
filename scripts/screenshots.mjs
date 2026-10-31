// captures real screenshots of the built carrier home pages for the generator page.
// usage: npm run screenshots            (builds first)
//        npm run screenshots -- --no-build
// playwright-core is not a project dependency, to keep installs small; set PLAYWRIGHT_CORE to the
// path of an installed copy. outputs go to public/carrier-shots/ and are committed.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'public', 'carrier-shots');
const require = createRequire(join(root, 'package.json'));
const sharp = require('sharp');
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const SLUGS = ['henley-ridge-freight', 'larkspur-cold-lines', 'ocotillo-ridge-flatbed'];
// keep in step with SHOT_SIZES in src/carrier/demo.ts
const VIEWS = {
  desktop: { viewport: { width: 1440, height: 900 }, scale: 1, widths: [800, 1440] },
  mobile: { viewport: { width: 390, height: 844 }, scale: 2, widths: [390, 780] },
};
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.ico': 'image/x-icon' };

function serve() {
  const server = createServer((req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    const file = join(dist, path);
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  // port 0 lets the os pick a free port
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  if (!process.argv.includes('--no-build')) execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  mkdirSync(out, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [kind, view] of Object.entries(VIEWS)) {
      const context = await browser.newContext({ viewport: view.viewport, deviceScaleFactor: view.scale, reducedMotion: 'reduce' });
      const page = await context.newPage();
      for (const slug of SLUGS) {
        await page.goto(`${base}/carrier-sites/${slug}/`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const png = await page.screenshot({ type: 'png' });
        for (const w of view.widths) {
          const img = sharp(png).resize({ width: w });
          const stem = join(out, `${slug}-${kind}-${w}`);
          await img.clone().avif({ quality: 55, effort: 6 }).toFile(`${stem}.avif`);
          await img.clone().webp({ quality: 80 }).toFile(`${stem}.webp`);
          await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${stem}.jpg`);
        }
        console.log(`captured ${slug} ${kind}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
