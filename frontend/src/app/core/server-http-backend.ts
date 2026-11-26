import { FetchBackend, HttpBackend, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { from, map, Observable, throwError } from 'rxjs';

/** Keep browser request keys for hydration; rewrite only at the transport boundary. */
@Injectable()
export class ServerHttpBackend implements HttpBackend {
  private readonly fetch = inject(FetchBackend);
  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const target = new URL(process.env['PORTFOLIO_API_TARGET'] || 'http://127.0.0.1:3000');
      target.pathname = url.pathname.slice('/api'.length);
      target.search = url.search;
      return this.fetch.handle(request.clone({ url: target.href })).pipe(
        map(event => event instanceof HttpResponse ? event.clone({ url: request.url }) : event),
      );
    }
    const fixture = /^\/(?:en\/)?data\/((?:projects|journey|skills|documents)\.(?:fr|en)\.json)$/.exec(url.pathname);
    if (fixture && request.method === 'GET') {
      const directory = process.env['PORTFOLIO_ASSET_DIR'] || join(process.cwd(), 'public');
      return from(readFile(join(directory, 'data', fixture[1]), 'utf8')).pipe(
        map(body => new HttpResponse({ body: JSON.parse(body), status: 200, url: request.url })),
      );
    }
    return throwError(() => new Error('Unsupported server-side HTTP request'));
  }
}
