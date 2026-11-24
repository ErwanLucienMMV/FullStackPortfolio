import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { JourneyKind } from '../core/journey.contract';
import { loadResource } from '../core/load-resource';
import { PortfolioRepository } from '../core/portfolio.repository';
import { SkeletonComponent } from '../shared/skeleton.component';

@Component({
  imports: [SkeletonComponent],
  templateUrl: './journey.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyPage {
  private readonly repository = inject(PortfolioRepository);
  readonly resource = loadResource(() => this.repository.journey());
  readonly entries = computed(() => {
    const state = this.resource.state();
    return state.status === 'ready' ? state.data : [];
  });
  readonly detailedEntries = computed(() => this.entries().filter(entry => entry.section));
  readonly kindLabels: Record<JourneyKind, string> = {
    experience: $localize`:@@journeyExperience:Expérience professionnelle`,
    education: $localize`:@@journeyEducation:Formation`,
    project: $localize`:@@journeyProject:Projet`,
    goal: $localize`:@@journeyGoal:À suivre`,
  };
}
