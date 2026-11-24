import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { loadResource } from '../core/load-resource';
import { PORTFOLIO_CONFIG } from '../core/portfolio.config';
import { PortfolioRepository } from '../core/portfolio.repository';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'app-document-panel',
  imports: [SkeletonComponent],
  templateUrl: './document-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPanelComponent {
  private readonly repository = inject(PortfolioRepository);
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly config = inject(PORTFOLIO_CONFIG);
  readonly resource = loadResource(() => this.repository.documents());
  readonly documents = computed(() => {
    const state = this.resource.state();
    return state.status === 'ready' ? state.data : null;
  });
  readonly previewUrl = computed(() => {
    const pdf = this.documents()?.resumePdf;
    if (!pdf) return null;
    // Embed only the site's or configured API's documents, never arbitrary origins.
    const origin = this.document.location.origin;
    try {
      const url = new URL(pdf.url, origin);
      const apiOrigin = new URL(this.config.apiBaseUrl, origin).origin;
      if (!['http:', 'https:'].includes(url.protocol) || ![origin, apiOrigin].includes(url.origin)) return null;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url.href);
    } catch { return null; }
  });
}
