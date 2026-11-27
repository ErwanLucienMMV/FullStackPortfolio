import { Injectable, NotFoundException, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_CATEGORIES } from './content.types';
import type { JourneyEntry, Project, ProjectCategory, TechnicalSkill } from './content.types';
import { contentLocale, validContent } from './content.validation';

@Injectable()
export class ContentService {
  async portfolioDiagram(): Promise<StreamableFile> {
    try {
      const svg = await readFile(join(__dirname, 'diagrams', 'full-stack-portfolio.svg'));
      return new StreamableFile(svg, {
        type: 'image/svg+xml',
        disposition: 'inline; filename="full-stack-portfolio.svg"',
      });
    } catch {
      throw new ServiceUnavailableException('Portfolio diagram is temporarily unavailable');
    }
  }

  async projects(locale: unknown, category?: string): Promise<Project[]> {
    if (category !== undefined && !(PROJECT_CATEGORIES as readonly string[]).includes(category)) {
      throw new NotFoundException('Unknown project category');
    }
    const projects = await this.load<Project[]>('projects', locale);
    return category === undefined ? projects : projects.filter(project => project.categories.includes(category as ProjectCategory));
  }

  journey(locale: unknown): Promise<JourneyEntry[]> {
    return this.load('journey', locale);
  }

  skills(locale: unknown): Promise<TechnicalSkill[]> {
    return this.load('skills', locale);
  }

  private async load<T>(resource: 'projects' | 'journey' | 'skills', locale: unknown): Promise<T> {
    const language = contentLocale(locale);
    const directory = process.env.PORTFOLIO_CONTENT_DIR || join(__dirname, 'data');
    try {
      const value: unknown = JSON.parse(await readFile(join(directory, `${resource}.${language}.json`), 'utf8'));
      if (!validContent(resource, value)) throw new Error('Invalid portfolio content');
      return value as T;
    } catch {
      throw new ServiceUnavailableException('Portfolio content is temporarily unavailable');
    }
  }
}
