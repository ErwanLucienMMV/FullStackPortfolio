import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from './projects.page';

describe('ProjectsPage GitHub activity', () => {
  let fixture: ComponentFixture<ProjectsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: LOCALE_ID, useValue: 'fr' },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function create() {
    fixture = TestBed.createComponent(ProjectsPage);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/projets?locale=fr').flush([]);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.github-stats') as HTMLElement;
  }

  it('shows the requested text and loads real statistics before displaying LIVE', () => {
    const stats = create();
    expect(fixture.nativeElement.textContent).toContain("Mes statistiques d'activites sur github");
    expect(fixture.nativeElement.textContent).not.toContain('Un espace prévu');
    expect(stats.getAttribute('aria-busy')).toBe('true');
    expect(stats.textContent).not.toContain('LIVE');
    expect(stats.textContent).not.toContain('Offline');
    const request = http.expectOne('/api/stats/github');
    expect(request.request.method).toBe('GET');
    request.flush({ publicRepositories: 12, contributions: 345, mainLanguages: ['TypeScript', 'C'] });
    fixture.detectChanges();
    expect([...stats.querySelectorAll('strong')].map(element => element.textContent?.trim()))
      .toEqual(['12', '345', 'TypeScript / C', 'LIVE']);
    expect(stats.getAttribute('aria-busy')).toBe('false');
  });

  it('preserves zero counts and handles an empty language list', () => {
    const stats = create();
    http.expectOne('/api/stats/github').flush({ publicRepositories: 0, contributions: 0, mainLanguages: [] });
    fixture.detectChanges();
    expect([...stats.querySelectorAll('strong')].map(element => element.textContent?.trim()))
      .toEqual(['0', '0', '—', 'LIVE']);
  });

  it.each(['HTTP', 'network'])('shows Offline after an %s failure without fabricating statistics', kind => {
    const stats = create();
    const request = http.expectOne('/api/stats/github');
    if (kind === 'HTTP') request.flush({}, { status: 503, statusText: 'Unavailable' });
    else request.error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect([...stats.querySelectorAll('strong')].map(element => element.textContent?.trim()))
      .toEqual(['—', '—', '—', 'Offline']);
    http.expectNone(request => request.url.startsWith('data/'));
  });

  it('shows Offline if the endpoint does not respond within 15 seconds', () => {
    vi.useFakeTimers();
    const stats = create();
    const request = http.expectOne('/api/stats/github');
    vi.advanceTimersByTime(15_000);
    fixture.detectChanges();
    expect(request.cancelled).toBe(true);
    expect(stats.querySelector('[role="status"]')!.textContent).toContain('Offline');
    expect(stats.getAttribute('aria-busy')).toBe('false');
  });

  it('cancels the stats request when navigating away', () => {
    create();
    const request = http.expectOne('/api/stats/github');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
