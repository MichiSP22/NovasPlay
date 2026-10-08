import { readFile, writeFile } from 'node:fs/promises';

// Cloudflare serves this shell only for account, checkout and callback routes.
// Keep noindex in its HTML as well as in route headers; never modify index.html.
const shell = new URL('../dist/NovasPlay/browser/index.csr.html', import.meta.url);
const html = await readFile(shell, 'utf8');
if (!/<meta name="robots" content="[^"]*">/.test(html)) {
  throw new Error('The client shell is missing its robots meta tag.');
}
await writeFile(shell, html
  .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,follow">')
  .replace(/<link rel="canonical" href="[^"]*">/, ''));
console.log('Client shell excluded from indexing; public prerendered pages preserved.');
