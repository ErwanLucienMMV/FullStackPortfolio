import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, LOCALE_ID } from '@angular/core';
import { catchError, map, Observable, shareReplay, timeout } from 'rxjs';
import { PORTFOLIO_CONFIG } from './portfolio.config';
import { GithubLanguageDistribution, GithubStats, JourneyEntry, PortfolioDocuments, Project, ProjectCategory, TechnicalSkill } from './portfolio.models';

@Injectable({ providedIn: 'root' })
export class PortfolioRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PORTFOLIO_CONFIG);
  private readonly locale = inject(LOCALE_ID);
  private readonly cache = new Map<string, Observable<unknown>>();

  projects(category: ProjectCategory | 'all' = 'all'): Observable<readonly Project[]> {
    const endpoint = category === 'all' ? 'projets' : `projets/${category}`;
    const url = `${this.config.apiBaseUrl.replace(/\/$/, '')}/${endpoint}`;
    return this.get<readonly Project[]>(`api:${endpoint}:${this.locale}`, url,
      new HttpParams().set('locale', this.locale),
    ).pipe(
      // Keep fallback outside the API cache so a later subscription retries the API.
      catchError(() => this.get<readonly Project[]>(
        `fixtures:projects:${this.locale}`, `data/projects.${this.locale.split('-')[0]}.json`,
      ).pipe(map(projects => category === 'all'
        ? projects
        : projects.filter(project => project.categories.includes(category))))),
    );
  }

  journey(): Observable<readonly JourneyEntry[]> {
    return this.get<readonly JourneyEntry[]>(`api:parcours:${this.locale}`,
      `${this.config.apiBaseUrl.replace(/\/$/, '')}/parcours`,
      new HttpParams().set('locale', this.locale),
    ).pipe(
      catchError(() => this.get<readonly JourneyEntry[]>(`fixtures:journey:${this.locale}`,
        `data/journey.${this.locale.split('-')[0]}.json`)),
    );
  }

  githubStats(): Observable<GithubStats> {
    return this.get<GithubStats>('api:stats/github',
      `${this.config.apiBaseUrl.replace(/\/$/, '')}/stats/github`);
  }

  githubLanguages(): Observable<GithubLanguageDistribution> {
    return this.get<GithubLanguageDistribution>('api:stats/github/languages',
      `${this.config.apiBaseUrl.replace(/\/$/, '')}/stats/github/languages`);
  }

  skills(): Observable<readonly TechnicalSkill[]> {
    return this.request<readonly TechnicalSkill[]>('skills');
  }

  documents(): Observable<PortfolioDocuments> {
    return this.request<PortfolioDocuments>('documents');
  }

  private request<T>(name: string): Observable<T> {
    const isApi = this.config.source === 'api';
    const url = isApi
      ? `${this.config.apiBaseUrl.replace(/\/$/, '')}/${name}`
      : `data/${name}.${this.locale.split('-')[0]}.json`;
    return this.get<T>(`${this.config.source}:${name}:${this.locale}`, url,
      isApi ? new HttpParams().set('locale', this.locale) : undefined);
  }

  private get<T>(key: string, url: string, params?: HttpParams): Observable<T> {
    const cached = this.cache.get(key);
    if (cached) return cached as Observable<T>;

    const result = this.http.get<T>(url, { params }).pipe(
      timeout(15_000),
      // Completed results are shared across the home page and project details.
      // Failed requests reset the cache subscription, so retry performs a new GET.
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.cache.set(key, result);
    return result;
  }
}
