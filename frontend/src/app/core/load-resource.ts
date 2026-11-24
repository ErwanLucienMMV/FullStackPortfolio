import { computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, defer, map, Observable, of, startWith, switchMap } from 'rxjs';
import { LoadState } from './portfolio.models';

/** Component-scoped request state; destruction cancels in-flight subscriptions. */
export function loadResource<T>(request: () => Observable<T>, reloadOn: () => unknown = () => undefined) {
  const revision = signal(0);
  const trigger = computed(() => ({ revision: revision(), dependency: reloadOn() }));
  const loading: LoadState<T> = { status: 'loading' };
  const state = toSignal(
    toObservable(trigger).pipe(
      switchMap(() => defer(request).pipe(
        map((data): LoadState<T> => ({ status: 'ready', data })),
        catchError(() => of<LoadState<T>>({ status: 'error' })),
        startWith(loading),
      )),
    ),
    { initialValue: loading },
  );
  return { state, retry: () => revision.update(value => value + 1) };
}
