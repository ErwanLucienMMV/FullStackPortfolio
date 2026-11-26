import { ChangeDetectionStrategy, Component, inject, RESPONSE_INIT } from '@angular/core';

@Component({
  template: '<h1>404</h1>',
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 60dvh;
    }
    h1 {
      margin: 0;
      color: #94c9ff;
      font-size: clamp(8rem, 24vw, 22rem);
      font-weight: 750;
      line-height: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
