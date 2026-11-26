import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withI18nSupport } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideClientHydration(withI18nSupport()),
    // Locale prefixes already belong to our routes; the HTML base locates assets.
    { provide: APP_BASE_HREF, useValue: '/' },
    provideRouter(routes, withInMemoryScrolling({
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled',
    })),
    // main.ts sets <html lang> from the URL before bootstrap; API content follows it.
    { provide: LOCALE_ID, useFactory: (document: Document) => document.documentElement.lang || 'fr', deps: [DOCUMENT] },
  ],
};
