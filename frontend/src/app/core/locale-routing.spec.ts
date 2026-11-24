import { describe, expect, it } from 'vitest';
import { languageUrl, localeFromPath, pagePath } from './locale-routing';

describe('Localized page URLs', () => {
  it.each([
    ['/fr', '/en'],
    ['/fr/parcours', '/en/journey'],
    ['/fr/projets', '/en/projects'],
    ['/fr/competences', '/en/skills'],
    ['/fr/contact', '/en/contact'],
    ['/fr/a-propos', '/en/about'],
  ])('switches %s to %s and back', (french, english) => {
    expect(languageUrl(french, 'en')).toBe(english);
    expect(languageUrl(english, 'fr')).toBe(french);
  });

  it('keeps the selected project and translates its case study anchor', () => {
    expect(languageUrl('/fr/projets?project=ft-minishell#etude-de-cas', 'en'))
      .toBe('/en/projects?project=ft-minishell#case-study');
    expect(languageUrl('/en/projects?project=ft-minishell#case-study', 'fr'))
      .toBe('/fr/projets?project=ft-minishell#etude-de-cas');
    expect(languageUrl('/fr/contact#cv', 'en')).toBe('/en/contact#resume');
    expect(languageUrl('/en/contact#resume', 'fr')).toBe('/fr/contact#cv');
  });

  it('defaults to French and recognizes only the complete English prefix', () => {
    expect(localeFromPath('/')).toBe('fr');
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/skills')).toBe('en');
    expect(localeFromPath('/english')).toBe('fr');
    expect(pagePath('fr', 'home')).toBe('/fr');
    expect(pagePath('en', 'projects')).toBe('/en/projects');
  });

  it('keeps invalid URLs invalid when switching languages', () => {
    expect(languageUrl('/fr/unknown?test=1', 'en')).toBe('/en/unknown?test=1');
    expect(languageUrl('/en/projects/unknown', 'fr')).toBe('/fr/projects/unknown');
    expect(languageUrl('/unknown', 'en')).toBe('/en/unknown');
  });
});
