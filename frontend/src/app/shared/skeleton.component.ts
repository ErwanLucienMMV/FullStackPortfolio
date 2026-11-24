import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" class="skeleton" [class.skeleton-page]="kind() === 'page'">
      <span class="sr-only" i18n="@@loading">Chargement du contenu…</span>
      <div aria-hidden="true">
        @if (kind() === 'page') {
          <div class="skeleton-line skeleton-eyebrow"></div>
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-description"></div>
        }
        <div [class.cards-grid]="kind() === 'page' || kind() === 'projects'" class="skeleton-grid">
          @for (card of cards(); track card) {
            <div class="panel skeleton-card" [class.skeleton-skill]="kind() === 'skills'" [class.skeleton-chart]="kind() === 'chart'" [class.skeleton-document]="kind() === 'document'">
              @if (kind() === 'page' || kind() === 'projects') { <div class="skeleton-cover"></div> }
              <div class="skeleton-line skeleton-heading"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line skeleton-short"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SkeletonComponent {
  readonly kind = input<'page' | 'projects' | 'skills' | 'chart' | 'document'>('page');
  readonly cards = computed(() => Array.from({
    length: this.kind() === 'chart' || this.kind() === 'document' ? 1 : this.kind() === 'skills' ? 7 : 3,
  }, (_, index) => index));
}
