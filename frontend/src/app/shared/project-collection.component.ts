import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { loadResource } from '../core/load-resource';
import { ProjectCategory } from '../core/portfolio.models';
import { PortfolioRepository } from '../core/portfolio.repository';
import { SkeletonComponent } from './skeleton.component';
import { LocaleLinks } from '../core/locale-links';

@Component({
  selector: 'app-project-collection',
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './project-collection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCollectionComponent {
  readonly links = inject(LocaleLinks);
  private readonly repository = inject(PortfolioRepository);
  readonly preview = input(false);
  readonly category = signal<ProjectCategory | 'all'>('all');
  readonly resource = loadResource(() => this.repository.projects(this.category()), this.category);
  readonly page = signal(0);
  readonly pageSize = 3;
  readonly filters: readonly { id: ProjectCategory | 'all'; label: string }[] = [
    { id: 'all', label: $localize`:@@filterAll:Tous` },
    { id: 'fullstack', label: $localize`:@@filterFullstack:Fullstack` },
    { id: 'relative-low-level', label: $localize`:@@filterRelativeLow:Bas niveau relatif` },
    { id: 'low-level', label: $localize`:@@filterLow:Bas niveau` },
    { id: 'backend', label: $localize`:@@filterBackend:Back-end` },
    { id: 'frontend', label: $localize`:@@filterFrontend:Front-web` },
    { id: 'devops', label: $localize`:@@filterDevops:Dev Ops` },
    { id: 'ai', label: $localize`:@@filterAi:IA` },
  ];
  readonly projectTypes = {
    school: $localize`:@@projectSchool:Scolaire`,
    personal: $localize`:@@projectPersonal:Personnel`,
    professional: $localize`:@@projectProfessional:Professionnel`,
  };
  readonly filtered = computed(() => {
    const state = this.resource.state();
    if (state.status !== 'ready') return [];
    const projects = state.data;
    if (this.preview() && this.category() === 'all') {
      return projects.filter(project => project.featured);
    }
    return projects;
  });
  readonly totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize));
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index));
  readonly visible = computed(() => this.filtered().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize));

  selectCategory(category: ProjectCategory | 'all') {
    this.category.set(category);
    this.page.set(0);
  }

  selectPage(page: number) {
    if (page >= 0 && page < this.totalPages()) this.page.set(page);
  }
}
