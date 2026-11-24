import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubLanguageDistribution } from '../core/portfolio.models';
import { LanguageChartComponent } from './language-chart.component';

const distribution: GithubLanguageDistribution = {
  username: 'ErwanLucienMMV', repositories: ['Example'], totalBytes: 1000,
  languages: [
    { name: 'TypeScript', bytes: 725, percentage: 72.5 },
    { name: 'Rust', bytes: 225, percentage: 22.5 },
    { name: 'Other', bytes: 50, percentage: 5 },
  ],
  updatedAt: '2026-11-24T12:00:00.000Z',
};

describe('LanguageChartComponent', () => {
  let fixture: ComponentFixture<LanguageChartComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'fr' },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function create() {
    fixture = TestBed.createComponent(LanguageChartComponent);
    fixture.detectChanges();
    TestBed.tick();
  }

  it('replaces loading skeletons with API languages and their exact percentages', () => {
    create();
    expect(fixture.nativeElement.querySelector('app-skeleton')).not.toBeNull();
    const request = http.expectOne('/api/stats/github/languages');
    expect(request.request.method).toBe('GET');
    request.flush(distribution);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeNull();
    const items = fixture.nativeElement.querySelectorAll('.chart-legend li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('TypeScript');
    expect(items[0].textContent).toContain('72,5 %');
    expect(items[1].textContent).toContain('Rust');
    expect(items[2].textContent).toContain('Autres');
    expect(fixture.nativeElement.querySelector('.language-bar span').style.flexGrow).toBe('72.5');
    expect(fixture.nativeElement.querySelector('.chart-status').textContent).toContain('LIVE');
    expect(fixture.nativeElement.textContent).not.toContain('Données d’exemple');
  });

  it('displays an empty state instead of fabricated values for an empty distribution', () => {
    create();
    http.expectOne('/api/stats/github/languages').flush({ ...distribution, totalBytes: 0, languages: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.language-bar')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Aucune donnée de langage disponible');
    http.expectNone(request => request.url.startsWith('data/'));
  });

  it('shows Offline on failure and retries the API without a sample fallback', () => {
    create();
    http.expectOne('/api/stats/github/languages').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chart-status').textContent).toContain('Offline');
    expect(fixture.nativeElement.querySelector('.language-bar')).toBeNull();
    http.expectNone(request => request.url.startsWith('data/'));
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/stats/github/languages').flush(distribution);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.chart-legend li')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('stops waiting after 15 seconds and shows Offline', () => {
    vi.useFakeTimers();
    create();
    const request = http.expectOne('/api/stats/github/languages');
    vi.advanceTimersByTime(15_000);
    fixture.detectChanges();
    expect(request.cancelled).toBe(true);
    expect(fixture.nativeElement.querySelector('.chart-status').textContent).toContain('Offline');
    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeNull();
  });

  it('cancels an unfinished request when navigating away', () => {
    create();
    const request = http.expectOne('/api/stats/github/languages');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
