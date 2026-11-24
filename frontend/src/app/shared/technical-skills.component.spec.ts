import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TechnicalSkillsComponent } from './technical-skills.component';

describe('TechnicalSkillsComponent', () => {
  it('distinguishes an unfilled assessment from an actual zero rating', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture = TestBed.createComponent(TechnicalSkillsComponent);
    fixture.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('data/skills.fr.json').flush([
      { id: 'c', name: 'C', rating: null, certifications: [], contexts: [] },
      { id: 'sql', name: 'SQL', rating: 0, certifications: ['Certificate'], contexts: ['Project'] },
    ]);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.skill-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('meter')).toBeNull();
    expect(cards[0].textContent).toContain('À renseigner');
    expect(cards[1].querySelector('meter').value).toBe(0);
    expect(cards[1].textContent).toContain('Certificate');
    http.verify();
  });
});
