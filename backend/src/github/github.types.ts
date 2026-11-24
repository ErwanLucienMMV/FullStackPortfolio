export interface GithubStats {
  publicRepositories: number;
  contributions: number;
  mainLanguages: string[];
}

export interface GithubLanguageDistribution {
  username: string;
  repositories: string[];
  totalBytes: number;
  languages: { name: string; bytes: number; percentage: number }[];
  updatedAt: string;
}

export interface RepositorySelection {
  username: string;
  include: string[];
  exclude: string[];
  allow_forks: string[];
  allow_archived: string[];
  top_n: number;
  show_other: boolean;
}

export interface PublicRepository {
  name: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
}
