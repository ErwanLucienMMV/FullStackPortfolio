import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleLinks } from '../core/locale-links';
import { RouterLink } from '@angular/router';
import { LanguageChartComponent } from '../shared/language-chart.component';
import { ProjectCollectionComponent } from '../shared/project-collection.component';
import { SkeletonComponent } from '../shared/skeleton.component';

@Component({
  imports: [RouterLink, LanguageChartComponent, ProjectCollectionComponent, SkeletonComponent],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage { readonly links = inject(LocaleLinks); }
