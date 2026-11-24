import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactPage } from './contact.page';

describe('ContactPage', () => {
  let fixture: ComponentFixture<ContactPage>;
  let http: HttpTestingController;
  let form: HTMLFormElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(ContactPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    form = fixture.nativeElement.querySelector('form');
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function field(name: string) {
    return form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement;
  }

  function fill(values: Record<string, string> = {}) {
    const data = { name: 'Élodie Dupont', email: 'elodie@example.com', subject: 'Un projet', message: 'Bonjour !', ...values };
    for (const [name, value] of Object.entries(data)) field(name).value = value;
  }

  function submit() {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it.each([
    ['name', ''], ['name', '   '], ['message', ''], ['message', ' \n\t '], ['subject', '   '],
    ['email', ''], ['email', 'invalid'], ['email', 'test@example'], ['email', '@example.com'],
    ['email', 'test@@example.com'], ['email', 'test name@example.com'],
  ])('rejects an invalid %s value (%j) without sending a request', (name, value) => {
    fill({ [name]: value });
    submit();
    http.expectNone('/api/contact-form');
    expect(field(name).getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelector(`#${name}-error`)).not.toBeNull();
    expect(form.querySelector('.submit-spinner')).toBeNull();
  });

  it('posts trimmed form data, shows a spinner, and prevents duplicate submissions', () => {
    fill({ name: ' Élodie Dupont ', email: ' elodie+work@example.com ', message: ' Bonjour ! ' });
    (form.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const request = http.expectOne('/api/contact-form');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Élodie Dupont', email: 'elodie+work@example.com', subject: 'Un projet', message: 'Bonjour !' });
    expect(form.querySelector('.submit-spinner')).not.toBeNull();
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(form.querySelector('button')!.disabled).toBe(true);
    submit();
    http.expectNone('/api/contact-form');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(form.querySelector('.submit-spinner')).toBeNull();
    expect(form.textContent).toContain('Votre message a bien été envoyé.');
    expect(field('message').value).toBe('');
    expect(form.querySelector('button')!.disabled).toBe(false);
  });

  it('shows the requested error, keeps entered text, and allows retry after an API failure', () => {
    fill();
    submit();
    http.expectOne('/api/contact-form').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(form.querySelector('[role="alert"]')!.textContent).toBe("Une erreur s'est produite");
    expect(form.querySelector('.submit-spinner')).toBeNull();
    expect(field('message').value).toBe('Bonjour !');
    expect(form.querySelector('button')!.disabled).toBe(false);
    submit();
    http.expectOne('/api/contact-form').flush({});
    fixture.detectChanges();
    expect(form.querySelector('[role="alert"]')).toBeNull();
    expect(form.textContent).toContain('Votre message a bien été envoyé.');
  });

  it('shows the requested error when the server cannot be reached', () => {
    fill();
    submit();
    http.expectOne('/api/contact-form').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(form.querySelector('[role="alert"]')!.textContent).toBe("Une erreur s'est produite");
    expect(form.querySelector('.submit-spinner')).toBeNull();
  });

  it('stops waiting after 15 seconds with no API response', () => {
    vi.useFakeTimers();
    fill();
    submit();
    const request = http.expectOne('/api/contact-form');
    vi.advanceTimersByTime(15_000);
    fixture.detectChanges();
    expect(request.cancelled).toBe(true);
    expect(form.querySelector('[role="alert"]')!.textContent).toBe("Une erreur s'est produite");
    expect(form.querySelector('.submit-spinner')).toBeNull();
    expect(form.querySelector('button')!.disabled).toBe(false);
  });

  it('cancels an unfinished submission when navigating away', () => {
    fill();
    submit();
    const request = http.expectOne('/api/contact-form');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
