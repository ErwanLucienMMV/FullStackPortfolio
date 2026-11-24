import { InjectionToken } from '@angular/core';

export interface PortfolioConfig {
  source: 'fixtures' | 'api';
  apiBaseUrl: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

// Projects, journey, and GitHub stats use the API. This switch controls skills/documents.
export const PORTFOLIO_CONFIG = new InjectionToken<PortfolioConfig>('PORTFOLIO_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    source: 'fixtures',
    apiBaseUrl: '/api',
    githubUrl: 'https://github.com/ErwanLucienMMV',
    linkedinUrl: 'https://www.linkedin.com/in/erwan-maigne-montamat/',
  }),
});
