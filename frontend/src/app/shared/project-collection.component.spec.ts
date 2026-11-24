import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Project } from '../core/portfolio.models';
import { ProjectCollectionComponent } from './project-collection.component';

const projects: Project[] = Array.from({ length: 5 }, (_, index) => ({
  id: `project-${index}`, name: `Project ${index + 1}`, description: `Description ${index + 1}`,
  categories: ['fullstack'], type: 'school', technologies: ['Angular'], featured: index < 3,
}));

describe('ProjectCollectionComponent', () => {
  let fixture: ComponentFixture<ProjectCollectionComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: LOCALE_ID, useValue: 'fr' },
    ] });
    fixture = TestBed.createComponent(ProjectCollectionComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
  });
  afterEach(() => http.verify());

  it('shows a skeleton while waiting for the HTTP response, then renders returned records', () => {
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    http.expectOne('/api/projets?locale=fr').flush(projects);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Project 1');
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('paginates the response and resets pagination after a category change', () => {
    http.expectOne('/api/projets?locale=fr').flush(projects);
    fixture.detectChanges();
    const next = [...fixture.nativeElement.querySelectorAll('.pagination button')] as HTMLButtonElement[];
    next.find(button => button.textContent?.includes('Suivant'))!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Project 4');
    const filters = [...fixture.nativeElement.querySelectorAll('.filter-button')] as HTMLButtonElement[];
    filters.find(button => button.textContent?.trim() === 'Fullstack')!.click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/projets/fullstack?locale=fr').flush(projects);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Project 1');
    filters.find(button => button.textContent?.trim() === 'IA')!.click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/projets/ai?locale=fr').flush([]);
    http.expectNone('data/projects.fr.json');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.project-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.pagination')).toBeNull();
    (fixture.nativeElement.querySelector('.project-empty button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(3);
  });

  it('renders sample projects when the API fails', () => {
    http.expectOne('/api/projets?locale=fr').flush({}, { status: 500, statusText: 'Error' });
    http.expectOne('data/projects.fr.json').flush(projects);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('offers a working retry if both the API and sample data fail', () => {
    http.expectOne('/api/projets?locale=fr').flush({}, { status: 500, statusText: 'Error' });
    http.expectOne('data/projects.fr.json').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/projets?locale=fr').flush(projects);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(3);
  });

  it('cancels an unfinished request when the lazy component is destroyed', () => {
    const request = http.expectOne('/api/projets?locale=fr');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });

  it('cancels a stale filter request and displays the latest category response', () => {
    http.expectOne('/api/projets?locale=fr').flush(projects);
    fixture.componentInstance.selectCategory('fullstack');
    TestBed.tick();
    const stale = http.expectOne('/api/projets/fullstack?locale=fr');
    fixture.componentInstance.selectCategory('ai');
    TestBed.tick();
    expect(stale.cancelled).toBe(true);
    const aiProject = { ...projects[0], name: 'AI project', categories: ['ai'] };
    http.expectOne('/api/projets/ai?locale=fr').flush([aiProject]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('AI project');
    expect(fixture.nativeElement.textContent).not.toContain('Project 1');
    http.expectNone('data/projects.fr.json');
  });

  it('requests the backend endpoint and renders a project belonging to multiple categories', () => {
    http.expectOne('/api/projets?locale=fr').flush(projects);
    fixture.detectChanges();
    const filters = [...fixture.nativeElement.querySelectorAll('.filter-button')] as HTMLButtonElement[];
    filters.find(button => button.textContent?.trim() === 'Back-end')!.click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/projets/backend?locale=fr').flush([{
      ...projects[0], id: '42matcha', name: '42matcha', categories: ['fullstack', 'backend', 'frontend'],
    }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.project-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('42matcha');
    http.expectNone('data/projects.fr.json');
  });
});
