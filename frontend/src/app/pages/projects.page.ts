import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { loadResource } from '../core/load-resource';
import { PortfolioRepository } from '../core/portfolio.repository';
import { ProjectCollectionComponent } from '../shared/project-collection.component';
import { LocaleLinks } from '../core/locale-links';

@Component({
  imports: [ProjectCollectionComponent],
  templateUrl: './projects.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPage {
  readonly links = inject(LocaleLinks);
  private readonly repository = inject(PortfolioRepository);
  private readonly route = inject(ActivatedRoute);
  readonly resource = loadResource(() => this.repository.projects());
  readonly githubResource = loadResource(() => this.repository.githubStats());
  readonly requestedProject = toSignal(this.route.queryParamMap.pipe(map(params => params.get('project'))));
  readonly selectedProject = computed(() => {
    const state = this.resource.state();
    if (state.status !== 'ready') return null;
    return state.data.find(project => project.id === this.requestedProject())
      ?? state.data.find(project => project.caseStudy)
      ?? state.data[0] ?? null;
  });
}
