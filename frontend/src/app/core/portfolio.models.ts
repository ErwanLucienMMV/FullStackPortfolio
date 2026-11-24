export type { Project, ProjectCaseStudy, ProjectCategory, ProjectImage } from './project.contract';
export type { JourneyEntry, JourneyHighlight, JourneyKind, JourneySection } from './journey.contract';

export interface TechnicalSkill {
  id: string;
  name: string;
  rating: number | null;
  certifications: readonly string[];
  contexts: readonly string[];
}

export interface PublicDocument {
  url: string;
  filename: string;
}

export interface PortfolioDocuments {
  resumePdf: PublicDocument | null;
  resumeDocx: PublicDocument | null;
  portfolioPdf: PublicDocument | null;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface GithubStats {
  publicRepositories: number;
  contributions: number;
  mainLanguages: readonly string[];
}

export interface GithubLanguageDistribution {
  username: string;
  repositories: readonly string[];
  totalBytes: number;
  languages: readonly { name: string; bytes: number; percentage: number }[];
  updatedAt: string;
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error' };
