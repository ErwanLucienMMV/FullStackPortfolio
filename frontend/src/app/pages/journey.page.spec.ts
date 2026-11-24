import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JourneyEntry } from '../core/journey.contract';
import { JourneyPage } from './journey.page';
import frenchJourney from '../../../public/data/journey.fr.json';

describe('JourneyPage', () => {
  let fixture: ComponentFixture<JourneyPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'fr' },
    ] });
    fixture = TestBed.createComponent(JourneyPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
  });
  afterEach(() => http.verify());

  it('renders all API cards, detail lines, and expanded sections from the returned list', () => {
    expect(fixture.nativeElement.querySelector('app-skeleton')).not.toBeNull();
    const extra: JourneyEntry = { id: 'new-entry', kind: 'project', period: '2027', title: 'New API entry',
      description: 'A new step', details: ['First detail', 'Second detail'] };
    http.expectOne('/api/parcours?locale=fr').flush([...frenchJourney, extra]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-track > li')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.timeline-rule > span')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.timeline-track > li:last-child .timeline-detail')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('05 / 2027');
    expect(fixture.nativeElement.textContent).toContain('New API entry');
    expect(fixture.nativeElement.querySelector('.timeline').style.getPropertyValue('--journey-count')).toBe('5');
    expect(fixture.nativeElement.querySelectorAll('.experience-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.training-grid > div')).toHaveLength(3);
    http.expectNone('data/journey.fr.json');
  });

  it('preserves an empty API result without loading fallback content', () => {
    http.expectOne('/api/parcours?locale=fr').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.timeline')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Le parcours sera bientôt disponible.');
    http.expectNone('data/journey.fr.json');
  });

  it('loads the localized list only after the API fails', () => {
    http.expectNone('data/journey.fr.json');
    http.expectOne('/api/parcours?locale=fr').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne('data/journey.fr.json').flush(frenchJourney);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-track > li')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('HN SERVICES');
  });

  it('allows retry if both API and fallback fail', () => {
    http.expectOne('/api/parcours?locale=fr').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne('data/journey.fr.json').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/parcours?locale=fr').flush(frenchJourney);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-track > li')).toHaveLength(4);
  });

  it('cancels unfinished requests when navigating away', () => {
    const request = http.expectOne('/api/parcours?locale=fr');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
