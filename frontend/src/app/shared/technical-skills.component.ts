import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { loadResource } from '../core/load-resource';
import { PortfolioRepository } from '../core/portfolio.repository';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'app-technical-skills',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let state = resource.state();
    <div [attr.aria-busy]="state.status === 'loading'">
      @if (state.status === 'loading') {
        <app-skeleton kind="skills" />
      } @else if (state.status === 'error') {
        <div class="panel empty-state" role="alert">
          <h3 i18n="@@skillsError">Les compétences n’ont pas pu être chargées.</h3>
          <button type="button" class="button button-primary" (click)="resource.retry()" i18n="@@retry">Réessayer</button>
        </div>
      } @else {
        <div class="skill-list">
          @for (skill of state.data; track skill.id) {
            <article class="panel skill-card">
              <h3>{{ skill.name }}</h3>
              <p class="eyebrow skill-rating"><span i18n="@@selfAssessment">Autoévaluation</span> ·
                @if (skill.rating !== null) { {{ skill.rating }} / 10 }
                @else { <span i18n="@@ratingNotProvided">— / 10 · À renseigner</span> }
              </p>
              @if (skill.rating !== null) {
                <meter [value]="skill.rating" min="0" max="10" [attr.aria-label]="skill.name">{{ skill.rating }} / 10</meter>
              } @else { <div class="unrated-line" aria-hidden="true"></div> }
              <dl>
                <dt i18n="@@certifications">Certifications</dt>
                <dd>@for (certificate of skill.certifications; track certificate) { <span>{{ certificate }}</span> }
                  @empty { <span i18n="@@certificationsPending">Certification à renseigner, si applicable.</span> }
                </dd>
                <dt i18n="@@usageContexts">Contextes d’utilisation</dt>
                <dd>@for (context of skill.contexts; track context) { <span>{{ context }}</span> }
                  @empty { <span i18n="@@contextsPending">Projet, formation ou expérience à renseigner.</span> }
                </dd>
              </dl>
            </article>
          } @empty {
            <div class="panel empty-state"><p i18n="@@skillsEmpty">Les compétences seront bientôt disponibles.</p></div>
          }
        </div>
      }
    </div>
  `,
})
export class TechnicalSkillsComponent {
  private readonly repository = inject(PortfolioRepository);
  readonly resource = loadResource(() => this.repository.skills());
}
