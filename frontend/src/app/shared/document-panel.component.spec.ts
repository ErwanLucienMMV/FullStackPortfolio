import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DocumentPanelComponent } from './document-panel.component';

describe('DocumentPanelComponent', () => {
  function create(pdf: { url: string; filename: string } | null) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture = TestBed.createComponent(DocumentPanelComponent);
    fixture.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('data/documents.fr.json').flush({ resumePdf: pdf, resumeDocx: null, portfolioPdf: null });
    fixture.detectChanges();
    http.verify();
    return fixture;
  }

  it('does not offer a broken download when the server has no CV', () => {
    const fixture = create(null);
    expect(fixture.nativeElement.querySelector('a[download]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.cv-placeholder')).not.toBeNull();
  });

  it('uses returned document metadata for the filename, link and PDF preview', () => {
    const fixture = create({ url: '/uploads/cv-2026.pdf', filename: 'Erwan-CV.pdf' });
    const download = fixture.nativeElement.querySelector('a[download]');
    expect(download.getAttribute('href')).toBe('/uploads/cv-2026.pdf');
    expect(download.getAttribute('download')).toBe('Erwan-CV.pdf');
    expect(fixture.nativeElement.querySelector('iframe')).not.toBeNull();
  });

  it('does not embed a document served from an unconfigured external origin', () => {
    const fixture = create({ url: 'https://unrelated.example/cv.pdf', filename: 'CV.pdf' });
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });
});
