/** Category slugs used by GET /projets/<category>. A project can match several. */
export type ProjectCategory = 'fullstack' | 'relative-low-level' | 'low-level' | 'backend' | 'frontend' | 'devops' | 'ai';

export interface ProjectImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

/** Detailed project presentation, following the ft_transcendance case study. */
export interface ProjectCaseStudy {
  summary: string;
  architecture: readonly string[];
  contributions: readonly string[];
  repositoryUrl?: string;
  diagramUrl?: string;
  reflection?: string;
}

/** Response item for project APIs and localized fallback JSON files. */
export interface Project {
  id: string;
  name: string;
  /** Source repository, available even without a detailed case study. */
  repositoryUrl?: string;
  /** Include devops for Docker/containerization work. */
  categories: readonly ProjectCategory[];
  description: string;
  type: 'school' | 'personal' | 'professional';
  technologies: readonly string[];
  featured?: boolean;
  image?: ProjectImage;
  caseStudy?: ProjectCaseStudy;
}
