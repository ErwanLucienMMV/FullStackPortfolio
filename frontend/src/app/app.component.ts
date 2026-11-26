import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, tap } from 'rxjs';
import { PORTFOLIO_CONFIG } from './core/portfolio.config';
import { SkeletonComponent } from './shared/skeleton.component';
import { LocaleLinks } from './core/locale-links';
import { languageUrl, SiteLocale } from './core/locale-routing';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SkeletonComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly config = inject(PORTFOLIO_CONFIG);
  readonly links = inject(LocaleLinks);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly year = new Date().getFullYear();
  readonly currentUrl = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(event => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  readonly navigation = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationStart || event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
    tap(() => this.menuOpen.set(false)),
    map(event => event instanceof NavigationStart ? 'loading' : event instanceof NavigationError ? 'error' : 'ready'),
  ), { initialValue: 'ready' });

  reload() { this.document.defaultView?.location.reload(); }
  languageHref(locale: SiteLocale) { return languageUrl(this.currentUrl(), locale); }
}
