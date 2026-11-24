import { inject, Injectable, LOCALE_ID } from '@angular/core';
import { ANCHORS, PageName, pagePath, SiteLocale } from './locale-routing';

@Injectable({ providedIn: 'root' })
export class LocaleLinks {
  readonly locale: SiteLocale = inject(LOCALE_ID).startsWith('en') ? 'en' : 'fr';
  readonly anchors = ANCHORS[this.locale];

  path(page: PageName) { return pagePath(this.locale, page); }
}
