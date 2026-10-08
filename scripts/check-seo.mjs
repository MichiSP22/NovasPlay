import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const output = new URL('../dist/NovasPlay/browser/', import.meta.url);
const origin = 'https://novasplay.neocharge.app';
const publicPaths = ['/', '/catalogo/', '/recargas-free-fire/', '/recargas-blood-strike/', '/terms-view/'];
const read = path => readFile(new URL(path, output), 'utf8');
const sitemap = await read('sitemap.xml');
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(match => match[0]);
const getMeta = (html, name) => tags(html, 'meta').find(tag => tag.includes(`name="${name}"`)) || '';

for (const path of publicPaths) {
  const html = await read(`${path.slice(1)}index.html`);
  const canonicals = tags(html, 'link').filter(tag => tag.includes('rel="canonical"'));
  assert.equal(canonicals.length, 1, `${path}: one canonical`);
  assert.ok(canonicals[0].includes(`href="${origin}${path}"`), `${path}: correct canonical`);
  assert.match(getMeta(html, 'robots'), /content="index,follow/, `${path}: indexable HTML`);
  assert.doesNotMatch(getMeta(html, 'robots'), /noindex/, `${path}: no noindex`);
  assert.match(html, /<h1\b[^>]*>[^<\s]/, `${path}: heading without JavaScript`);
  assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`), `${path}: present in sitemap`);
}

const shell = await read('index.csr.html');
assert.match(getMeta(shell, 'robots'), /noindex/, 'Private client shell must not be indexed');
assert.doesNotMatch(shell, /rel="canonical"/, 'Client shell must not claim to be the homepage');
const notFound = await read('404.html');
assert.match(getMeta(notFound, 'robots'), /noindex/);
assert.match(notFound, /Esta página no existe/);
const redirects = await read('_redirects');
assert.doesNotMatch(redirects, /^\/\*\s/m, 'Unknown paths must not rewrite to the homepage');
assert.match(redirects, /^\/checkout\/:id \/index\.csr 200$/m, 'Direct checkout links remain supported');
assert.match(redirects, /^\/Access\/Google\/Callback \/index\.csr 200$/m, 'Google login callback remains supported');
console.log('SEO build checks passed: 5 public pages, sitemap, private shell, 404 and application routes.');

// Optional: validate HTTP behavior after starting the local server or deploying.
const base = process.argv[2];
if (base) {
  for (const path of publicPaths) {
    const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${path}: HTTP 200`);
    assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/i, `${path}: no blocking header`);
    const html = await response.text();
    assert.match(getMeta(html, 'robots'), /content="index,follow/);
  }
  const missing = await fetch(new URL('/no-existe-auditoria-seo', base), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(missing.status, 404, 'Nonexistent URL must return a real HTTP 404');
  assert.match(await missing.text(), /Esta página no existe/);
  const catalog = await fetch(new URL('/catalogo?utm_source=seo-check', base), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.ok([301, 308].includes(catalog.status), 'Canonical redirect must be permanent');
  const destination = new URL(catalog.headers.get('location'), base);
  assert.equal(destination.pathname, '/catalogo/');
  assert.equal(destination.search, '?utm_source=seo-check');
  for (const path of ['/profile', '/cart-checkout', '/Access/Google/Callback']) {
    const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if (path === '/cart-checkout' && response.status === 302) {
      // Server rendering sends an anonymous visitor with an empty cart home.
      assert.equal(new URL(response.headers.get('location'), base).pathname, '/');
    } else {
      assert.equal(response.status, 200, `${path}: direct application link remains available`);
    }
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/i, `${path}: private route blocked from indexing`);
  }
  console.log(`HTTP SEO checks passed against ${base}`);
}
