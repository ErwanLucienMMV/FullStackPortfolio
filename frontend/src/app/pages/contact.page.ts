import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { PORTFOLIO_CONFIG } from '../core/portfolio.config';
import { ContactMessage } from '../core/portfolio.models';
import { DocumentPanelComponent } from '../shared/document-panel.component';
import { SkeletonComponent } from '../shared/skeleton.component';
import { LocaleLinks } from '../core/locale-links';

@Component({
  imports: [DocumentPanelComponent, SkeletonComponent],
  templateUrl: './contact.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  readonly links = inject(LocaleLinks);
  readonly config = inject(PORTFOLIO_CONFIG);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  readonly errors = signal<Partial<Record<keyof ContactMessage, boolean>>>({});
  readonly status = signal<'idle' | 'sending' | 'success' | 'error'>('idle');

  submit(event: Event) {
    event.preventDefault();
    if (this.status() === 'sending') return;

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const message: ContactMessage = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      subject: String(data.get('subject') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
    };
    const errors = {
      name: message.name.length === 0,
      email: !this.emailPattern.test(message.email),
      subject: message.subject.length === 0,
      message: message.message.length === 0,
    };
    this.errors.set(errors);
    this.status.set('idle');
    if (Object.values(errors).some(Boolean)) return;

    this.status.set('sending');
    this.http.post<void>(`${this.config.apiBaseUrl.replace(/\/$/, '')}/contact-form`, message).pipe(
      timeout(15_000),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.status.set('success');
        form.reset();
      },
      error: () => this.status.set('error'),
    });
  }
}
