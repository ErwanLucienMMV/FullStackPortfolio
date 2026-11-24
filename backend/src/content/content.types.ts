export const PROJECT_CATEGORIES = [
  'fullstack', 'relative-low-level', 'low-level', 'backend', 'frontend', 'devops', 'ai',
] as const;
export type ProjectCategory = typeof PROJECT_CATEGORIES[number];
export type ContentLocale = 'fr' | 'en';

// Response contracts mirror frontend/src/app/core/{project,journey}.contract.ts
// and portfolio.models.ts. Keep their stable IDs shared between locales.
export interface Project {
  id: string;
  name: string;
  repositoryUrl?: string;
  categories: ProjectCategory[];
  description: string;
  type: 'school' | 'personal' | 'professional';
  technologies: string[];
  featured?: boolean;
  image?: { url: string; alt: string; width: number; height: number };
  caseStudy?: {
    summary: string;
    architecture: string[];
    contributions: string[];
    repositoryUrl?: string;
    diagramUrl?: string;
    reflection?: string;
  };
}

export interface JourneyEntry {
  id: string;
  kind: 'experience' | 'education' | 'project' | 'goal';
  period: string;
  title: string;
  description: string;
  details: string[];
  section?: {
    title: string;
    description: string;
    highlights?: { id: string; title: string; description: string; technologies: string[] }[];
    topics?: string[];
  };
}

export interface TechnicalSkill {
  id: string;
  name: string;
  rating: number | null;
  certifications: string[];
  contexts: string[];
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
