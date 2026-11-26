import { SiteLocale } from './locale-routing';

export function setPageMetadata(document: Document, locale: SiteLocale) {
  document.documentElement.lang = locale;
  document.title = locale === 'en'
    ? 'Erwan Maigne Montamat — Full Stack Developer'
    : 'Erwan Maigne Montamat — Développeur Full Stack';
  document.querySelector('meta[name="description"]')?.setAttribute('content', locale === 'en'
    ? 'Erwan Maigne Montamat’s portfolio, Full Stack developer: Angular, TypeScript, NestJS and DevOps.'
    : 'Le portfolio d’Erwan Maigne Montamat, développeur Full Stack : Angular, TypeScript, NestJS et DevOps.');
}
