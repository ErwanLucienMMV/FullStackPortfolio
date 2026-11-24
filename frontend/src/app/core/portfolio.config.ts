import { InjectionToken } from '@angular/core';

export interface PortfolioConfig {
  source: 'fixtures' | 'api';
  apiBaseUrl: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

// All content uses the API by default. Fixture mode remains available for skills/documents.
export const PORTFOLIO_CONFIG = new InjectionToken<PortfolioConfig>('PORTFOLIO_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    source: 'api',
    apiBaseUrl: '/api',
    githubUrl: 'https://github.com/ErwanLucienMMV',
    linkedinUrl: 'https://www.linkedin.com/in/erwan-maigne-montamat/',
  }),
});
