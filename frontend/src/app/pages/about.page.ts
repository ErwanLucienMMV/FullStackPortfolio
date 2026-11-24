import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleLinks } from '../core/locale-links';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  templateUrl: './about.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage { readonly links = inject(LocaleLinks); }
