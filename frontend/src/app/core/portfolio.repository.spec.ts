import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PORTFOLIO_CONFIG } from './portfolio.config';
import { Project } from './portfolio.models';
import { PortfolioRepository } from './portfolio.repository';
import frenchProjects from '../../../public/data/projects.fr.json';
import englishProjects from '../../../public/data/projects.en.json';
import englishJourney from '../../../public/data/journey.en.json';

describe('PortfolioRepository', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'fr' },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shares one localized content request between multiple consumers', () => {
    const repository = TestBed.inject(PortfolioRepository);
    const values: unknown[] = [];
    repository.projects().subscribe(value => values.push(value));
    repository.projects().subscribe(value => values.push(value));
    TestBed.inject(HttpTestingController).expectOne('/api/projets?locale=fr').flush([]);
    TestBed.inject(HttpTestingController).expectNone('data/projects.fr.json');
    expect(values).toEqual([[], []]);
  });

  it('uses the configurable API and sends the active content locale', () => {
    TestBed.overrideProvider(LOCALE_ID, { useValue: 'en-GB' });
    TestBed.overrideProvider(PORTFOLIO_CONFIG, { useValue: { source: 'api', apiBaseUrl: '/api/' } });
    TestBed.inject(PortfolioRepository).skills().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/skills?locale=en-GB');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it.each(['fullstack', 'relative-low-level', 'low-level', 'backend', 'frontend', 'devops', 'ai'] as const)(
    'requests the %s category from its own API endpoint', category => {
      TestBed.inject(PortfolioRepository).projects(category).subscribe();
      const http = TestBed.inject(HttpTestingController);
      const request = http.expectOne(`/api/projets/${category}?locale=fr`);
      expect(request.request.method).toBe('GET');
      request.flush([]);
      http.expectNone('data/projects.fr.json');
    },
  );

  it('loads and filters sample projects only after the category API fails', () => {
    const http = TestBed.inject(HttpTestingController);
    let result: unknown;
    TestBed.inject(PortfolioRepository).projects('fullstack').subscribe(value => result = value);
    http.expectNone('data/projects.fr.json');
    http.expectOne('/api/projets/fullstack?locale=fr').flush({}, { status: 503, statusText: 'Unavailable' });
    const samples: Project[] = [
      { id: 'fullstack-example', name: 'Web project', description: 'A web project', type: 'personal',
        technologies: ['TypeScript'], categories: ['backend', 'fullstack', 'frontend'] },
      { id: 'low-level-example', name: 'C project', description: 'A C project', type: 'school',
        technologies: ['C'], categories: ['low-level'] },
    ];
    http.expectOne('data/projects.fr.json').flush(samples);
    expect(result).toEqual([samples[0]]);
  });

  it('falls back on a network error and retries the API for a later subscriber', () => {
    const repository = TestBed.inject(PortfolioRepository);
    const http = TestBed.inject(HttpTestingController);
    const results: unknown[] = [];
    repository.projects().subscribe(value => results.push(value));
    http.expectOne('/api/projets?locale=fr').error(new ProgressEvent('error'));
    const sample = [{ id: 'sample-project' }] as Project[];
    http.expectOne('data/projects.fr.json').flush(sample);
    repository.projects().subscribe(value => results.push(value));
    const actual = [{ id: 'api-project' }] as Project[];
    http.expectOne('/api/projets?locale=fr').flush(actual);
    expect(results).toEqual([sample, actual]);
  });

  it('reports an error if both sources fail and can retry', () => {
    const repository = TestBed.inject(PortfolioRepository);
    const http = TestBed.inject(HttpTestingController);
    let errors = 0;
    repository.projects().subscribe({ error: () => errors++ });
    http.expectOne('/api/projets?locale=fr').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne('data/projects.fr.json').flush({}, { status: 503, statusText: 'Unavailable' });
    let result: unknown;
    repository.projects().subscribe(value => result = value);
    http.expectOne('/api/projets?locale=fr').flush([]);
    expect(errors).toBe(1);
    expect(result).toEqual([]);
  });

  it('loads document metadata rather than baking a CV path into the app', () => {
    let documents: unknown;
    TestBed.inject(PortfolioRepository).documents().subscribe(value => documents = value);
    const metadata = { resumePdf: { url: '/uploads/new-cv.pdf', filename: 'Erwan-CV.pdf' }, resumeDocx: null, portfolioPdf: null };
    TestBed.inject(HttpTestingController).expectOne('/api/documents?locale=fr').flush(metadata);
    expect(documents).toEqual(metadata);
  });

  it('requests English API content and uses English samples only after an error', () => {
    TestBed.overrideProvider(LOCALE_ID, { useValue: 'en' });
    const repository = TestBed.inject(PortfolioRepository);
    const http = TestBed.inject(HttpTestingController);
    repository.projects('fullstack').subscribe();
    http.expectNone('data/projects.en.json');
    http.expectOne('/api/projets/fullstack?locale=en').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne('data/projects.en.json').flush([]);
    repository.skills().subscribe();
    http.expectOne('/api/skills?locale=en').flush([]);
    repository.documents().subscribe();
    http.expectOne('/api/documents?locale=en').flush({ resumePdf: null, resumeDocx: null, portfolioPdf: null });
  });

  it('retains explicit fixture mode for skills and documents', () => {
    TestBed.overrideProvider(PORTFOLIO_CONFIG, { useValue: { source: 'fixtures', apiBaseUrl: '/api' } });
    const repository = TestBed.inject(PortfolioRepository);
    const http = TestBed.inject(HttpTestingController);
    repository.skills().subscribe();
    http.expectOne('data/skills.fr.json').flush([]);
    repository.documents().subscribe();
    http.expectOne('data/documents.fr.json').flush({ resumePdf: null, resumeDocx: null, portfolioPdf: null });
  });

  it.each([
    ['fr', frenchProjects], ['en', englishProjects],
  ] as const)('includes completed Matcha in the web and DevOps filters in %s', (locale, samples) => {
    TestBed.overrideProvider(LOCALE_ID, { useValue: locale });
    const repository = TestBed.inject(PortfolioRepository);
    const http = TestBed.inject(HttpTestingController);
    for (const category of ['fullstack', 'backend', 'frontend', 'devops'] as const) {
      let result: readonly Project[] = [];
      repository.projects(category).subscribe(projects => result = projects);
      http.expectOne(`/api/projets/${category}?locale=${locale}`)
        .flush({}, { status: 503, statusText: 'Unavailable' });
      if (category === 'fullstack') http.expectOne(`data/projects.${locale}.json`).flush(samples);
      expect(result.map(project => project.id)).toContain('ft-transcendance');
      expect(result.map(project => project.id)).toContain('42matcha');
      const matcha = result.find(project => project.id === '42matcha')!;
      expect(matcha.categories).toEqual(['fullstack', 'backend', 'frontend', 'devops']);
      expect(matcha).not.toHaveProperty('category');
      expect(matcha.description).not.toMatch(/en développement|in development/);
    }
  });

  it('uses the English journey fallback after an API error and retries the API later', () => {
    TestBed.overrideProvider(LOCALE_ID, { useValue: 'en' });
    const repository = TestBed.inject(PortfolioRepository);
    const http = TestBed.inject(HttpTestingController);
    const results: unknown[] = [];
    repository.journey().subscribe(entries => results.push(entries));
    http.expectNone('data/journey.en.json');
    http.expectOne('/api/parcours?locale=en').error(new ProgressEvent('error'));
    http.expectOne('data/journey.en.json').flush(englishJourney);
    repository.journey().subscribe(entries => results.push(entries));
    http.expectOne('/api/parcours?locale=en').flush([]);
    expect(results).toEqual([englishJourney, []]);
  });
});
