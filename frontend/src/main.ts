import { loadTranslations } from '@angular/localize';
import { localeFromPath } from './app/core/locale-routing';
import { setPageMetadata } from './app/core/page-metadata';

async function start() {
  const locale = localeFromPath(window.location.pathname);
  setPageMetadata(document, locale);
  if (locale === 'en') {
    const { default: translations } = await import('./locale/messages.en.json');
    loadTranslations(translations.translations);
  }
  // Components must be evaluated after translations are loaded, including lazy pages.
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
}

start().catch(console.error);
