import { BadRequestException } from '@nestjs/common';
import { PROJECT_CATEGORIES } from './content.types';
import type { ContentLocale } from './content.types';

export function contentLocale(value: unknown): ContentLocale {
  if (value === undefined) return 'fr';
  if (typeof value !== 'string' || !/^(fr|en)(?:-[a-z0-9]{2,8})*$/i.test(value)) {
    throw new BadRequestException('locale must be fr or en (regional variants are accepted)');
  }
  return value.slice(0, 2).toLowerCase() as ContentLocale;
}

type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(text);
}
function fields(value: RecordValue, names: string[]): boolean {
  return names.every(name => text(value[name]));
}
function rows(value: unknown, valid: (row: RecordValue) => boolean): boolean {
  return Array.isArray(value) && value.every(row => record(row) && text(row.id) && valid(row)) &&
    new Set(value.map(row => row.id)).size === value.length;
}
function webUrl(value: unknown): boolean {
  if (!text(value)) return false;
  // Public assets can be served on this origin or a remote HTTP(S) origin.
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

function project(row: RecordValue): boolean {
  if (!fields(row, ['name', 'description']) || !strings(row.technologies) ||
    !strings(row.categories) || !row.categories.length ||
    !row.categories.every(category => (PROJECT_CATEGORIES as readonly string[]).includes(category)) ||
    typeof row.type !== 'string' || !['school', 'personal', 'professional'].includes(row.type) ||
    (row.featured !== undefined && typeof row.featured !== 'boolean') ||
    (row.repositoryUrl !== undefined && !webUrl(row.repositoryUrl))) return false;
  if (row.image !== undefined) {
    const image = row.image;
    if (!record(image) || !webUrl(image.url) || !text(image.alt) ||
      !Number.isSafeInteger(image.width) || Number(image.width) <= 0 ||
      !Number.isSafeInteger(image.height) || Number(image.height) <= 0) return false;
  }
  if (row.caseStudy !== undefined) {
    const study = row.caseStudy;
    if (!record(study) || !text(study.summary) || !strings(study.architecture) || !strings(study.contributions) ||
      (study.repositoryUrl !== undefined && !webUrl(study.repositoryUrl)) ||
      (study.diagramUrl !== undefined && !webUrl(study.diagramUrl)) ||
      (study.reflection !== undefined && !text(study.reflection))) return false;
  }
  return true;
}

function journey(row: RecordValue): boolean {
  if (!fields(row, ['period', 'title', 'description']) || !strings(row.details) ||
    typeof row.kind !== 'string' || !['experience', 'education', 'project', 'goal'].includes(row.kind)) return false;
  if (row.section === undefined) return true;
  const section = row.section;
  return record(section) && fields(section, ['title', 'description']) &&
    (section.topics === undefined || strings(section.topics)) &&
    (section.highlights === undefined || rows(section.highlights, highlight =>
      fields(highlight, ['title', 'description']) && strings(highlight.technologies)));
}

function skill(row: RecordValue): boolean {
  return text(row.name) && strings(row.certifications) && strings(row.contexts) &&
    (row.rating === null || (typeof row.rating === 'number' && Number.isFinite(row.rating) && row.rating >= 0 && row.rating <= 10));
}

export function validContent(resource: 'projects' | 'journey' | 'skills', value: unknown): boolean {
  return rows(value, { projects: project, journey, skills: skill }[resource]);
}
