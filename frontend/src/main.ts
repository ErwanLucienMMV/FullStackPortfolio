import { loadTranslations } from '@angular/localize';
import { localeFromPath } from './app/core/locale-routing';

async function start() {
  const locale = localeFromPath(window.location.pathname);
  document.documentElement.lang = locale;
  $localize.locale = locale;
  if (locale === 'en') {
    const { default: translations } = await import('./locale/messages.en.json');
    loadTranslations(translations);
    document.title = 'Erwan Maigne Montamat — Full Stack Developer';
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Erwan Maigne Montamat’s portfolio, Full Stack developer: Angular, TypeScript, NestJS and DevOps.');
  }
  // Components must be evaluated after translations are loaded, including lazy pages.
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
}

start().catch(console.error);
