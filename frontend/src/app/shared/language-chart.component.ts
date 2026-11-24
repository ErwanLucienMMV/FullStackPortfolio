import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID } from '@angular/core';
import { loadResource } from '../core/load-resource';
import { PortfolioRepository } from '../core/portfolio.repository';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'app-language-chart',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let state = resource.state();
    @if (state.status === 'loading') {
      <app-skeleton kind="chart" />
    } @else {
      <div class="panel language-chart">
        <div class="chart-heading">
          <div><p class="eyebrow" i18n="@@languageDistribution">Répartition des langages</p><h3 i18n="@@repositoryLanguages">Langages de mes repositories</h3></div>
          <span class="chart-status" role="status">
            @if (state.status === 'error') { <span i18n="@@githubOffline">Offline</span> }
            @else { LIVE }
          </span>
        </div>
        @if (state.status === 'error') {
          <div role="alert">
            <p i18n="@@languageStatsError">Les statistiques des langages n’ont pas pu être chargées.</p>
            <button type="button" class="button button-primary" (click)="resource.retry()" i18n="@@retry">Réessayer</button>
          </div>
        } @else if (languages().length === 0) {
          <p i18n="@@languageStatsEmpty">Aucune donnée de langage disponible pour le moment.</p>
        } @else {
          <div class="language-bar" aria-hidden="true">
            @for (language of languages(); track language.name) {
              @if (language.percentage > 0) { <span [style.flex-grow]="language.percentage" [style.background]="language.color"></span> }
            }
          </div>
          <ul class="chart-legend" aria-label="Répartition des langages des repositories" i18n-aria-label="@@languageLegend">
            @for (language of languages(); track language.name) {
              <li><span class="legend-dot" [style.background]="language.color" aria-hidden="true"></span>{{ displayName(language.name) }} <span>{{ formatPercentage(language.percentage) }} %</span></li>
            }
          </ul>
        }
        <p class="chart-note"><strong i18n="@@githubSource">Source : GitHub</strong><span i18n="@@repositoryDistributionNote">Les pourcentages représentent la répartition du code dans les repositories sélectionnés.</span></p>
      </div>
    }
  `,
})
export class LanguageChartComponent {
  private readonly repository = inject(PortfolioRepository);
  private readonly formatter = new Intl.NumberFormat(inject(LOCALE_ID), { maximumFractionDigits: 1 });
  private readonly colors = ['var(--cyan)', 'var(--violet)', 'var(--blue)', 'var(--mint)', 'var(--orange)', 'var(--pink)', 'var(--slate)'];
  readonly resource = loadResource(() => this.repository.githubLanguages());
  readonly languages = computed(() => {
    const state = this.resource.state();
    return state.status === 'ready'
      ? state.data.languages.map((language, index) => ({ ...language, color: this.colors[index % this.colors.length] }))
      : [];
  });

  formatPercentage(value: number) { return this.formatter.format(value); }
  displayName(name: string) { return name === 'Other' ? $localize`:@@otherLanguages:Autres` : name; }
}
