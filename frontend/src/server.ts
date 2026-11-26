import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import { createServer, IncomingMessage, ServerResponse, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { PAGE_PATHS } from './app/core/locale-routing';

const browserDirectory = resolve(import.meta.dirname, '../browser');
const legacyPages = new Set(Object.values(PAGE_PATHS.fr).filter(Boolean).map(slug => '/' + slug));
const engine = new AngularNodeAppEngine({
  allowedHosts: ['localhost', '127.0.0.1', ...(process.env['TLS_DOMAIN'] ? [process.env['TLS_DOMAIN']] : [])],
  // Only trusted Nginx may reach this private server in production.
  trustProxyHeaders: ['x-forwarded-proto', 'x-forwarded-host'],
});
const types: Record<string, string> = {
  '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon',
};

async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok\n');
      return;
    }
    // Generated Angular redirect metadata omits incoming queries. Preserve selections.
    if (['GET', 'HEAD'].includes(request.method || '')) {
      const canonical = url.pathname === '/' || url.pathname === '/index.html'
        ? '/fr' : legacyPages.has(url.pathname) ? '/fr' + url.pathname : null;
      if (canonical) {
        response.writeHead(308, { Location: canonical + url.search }).end();
        return;
      }
    }
    // Also support a standalone local SSR preview without Nginx.
    if (url.pathname.startsWith('/api/')) {
      const target = new URL(process.env['PORTFOLIO_API_TARGET'] || 'http://127.0.0.1:3000');
      target.pathname = url.pathname.slice('/api'.length);
      target.search = url.search;
      const proxy = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
        method: request.method, headers: { ...request.headers, host: target.host }, timeout: 20_000,
      }, upstream => {
        response.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(response);
      });
      proxy.on('timeout', () => proxy.destroy());
      proxy.on('error', () => {
        if (!response.headersSent) response.writeHead(502);
        response.end('API unavailable');
      });
      request.on('aborted', () => proxy.destroy());
      request.pipe(proxy);
      return;
    }
    const type = types[extname(url.pathname)];
    if (type && ['GET', 'HEAD'].includes(request.method || '')) {
      const file = resolve(browserDirectory, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(browserDirectory + sep)) { response.writeHead(404).end(); return; }
      try {
        const body = await readFile(file);
        response.writeHead(200, { 'Content-Type': type });
        response.end(request.method === 'HEAD' ? undefined : body);
      } catch { response.writeHead(404).end(); }
      return;
    }
    const rendered = await engine.handle(request);
    if (rendered) {
      rendered.headers.set('Cache-Control', 'no-store');
      await writeResponseToNodeResponse(rendered, response);
    } else { response.writeHead(404).end('Not found'); }
  } catch (error) {
    console.error('Server rendering failed', error);
    if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end('This page is temporarily unavailable');
  }
}
export const reqHandler = createNodeRequestHandler(handler);
if (isMainModule(import.meta.url)) {
  const server = createServer(handler);
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.listen(Number(process.env['PORT'] || 4000), '0.0.0.0');
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
