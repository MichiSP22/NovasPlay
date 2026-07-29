import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
const privateRoutePattern = /^\/(admin|profile|checkout|cart-checkout|Access)(\/|$)/i;
const prerenderedPages = new Map([
  ['/', 'index.html'],
  ['/terms-view', 'terms-view/index.html'],
]);

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */


app.use((req, res, next) => {
  if (privateRoutePattern.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const pagePath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  const htmlFile = prerenderedPages.get(pagePath);
  if (!htmlFile) {
    next();
    return;
  }
  const absoluteHtmlFile = join(browserDistFolder, htmlFile);
  if (!existsSync(absoluteHtmlFile)) {
    next();
    return;
  }

  res.sendFile(absoluteHtmlFile);
});
/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
