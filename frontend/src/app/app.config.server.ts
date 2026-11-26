import { DOCUMENT } from '@angular/common';
import { HttpBackend } from '@angular/common/http';
import { ApplicationConfig, inject, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ServerHttpBackend } from './core/server-http-backend';
import { setPageMetadata } from './core/page-metadata';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: HttpBackend, useClass: ServerHttpBackend },
    provideAppInitializer(() => {
      const document = inject(DOCUMENT);
      setPageMetadata(document, document.documentElement.lang.startsWith('en') ? 'en' : 'fr');
    }),
  ],
};
export const config = mergeApplicationConfig(appConfig, serverConfig);
