import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from '../shared/skeleton.component';
import { TechnicalSkillsComponent } from '../shared/technical-skills.component';

@Component({
  imports: [SkeletonComponent, TechnicalSkillsComponent],
  templateUrl: './skills.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsPage {}
