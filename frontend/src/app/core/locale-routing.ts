export type SiteLocale = 'fr' | 'en';
export type PageName = 'home' | 'journey' | 'projects' | 'skills' | 'contact' | 'about';

export const PAGE_PATHS: Record<SiteLocale, Record<PageName, string>> = {
  fr: { home: '', journey: 'parcours', projects: 'projets', skills: 'competences', contact: 'contact', about: 'a-propos' },
  en: { home: '', journey: 'journey', projects: 'projects', skills: 'skills', contact: 'contact', about: 'about' },
};

export const ANCHORS = {
  fr: { resume: 'cv', caseStudy: 'etude-de-cas' },
  en: { resume: 'resume', caseStudy: 'case-study' },
} as const;

export function localeFromPath(pathname: string): SiteLocale {
  return /^\/en(?:\/|$)/.test(pathname) ? 'en' : 'fr';
}

export function pagePath(locale: SiteLocale, page: PageName): string {
  const slug = PAGE_PATHS[locale][page];
  return `/${locale}${slug ? `/${slug}` : ''}`;
}

/** Translate a page URL while retaining its project selection and anchor. */
export function languageUrl(currentUrl: string, target: SiteLocale): string {
  const url = new URL(currentUrl, 'https://portfolio.invalid');
  const source = localeFromPath(url.pathname);
  const segments = url.pathname.split('/').filter(Boolean);
  const pageSegments = segments[0] === source ? segments.slice(1) : segments;
  const page = pageSegments.length <= 1
    ? (Object.keys(PAGE_PATHS[source]) as PageName[])
      .find(key => PAGE_PATHS[source][key] === (pageSegments[0] ?? ''))
    : undefined;
  url.pathname = page ? pagePath(target, page) : `/${target}/${pageSegments.join('/')}`;
  for (const key of ['resume', 'caseStudy'] as const) {
    if (url.hash === `#${ANCHORS[source][key]}`) url.hash = ANCHORS[target][key];
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
