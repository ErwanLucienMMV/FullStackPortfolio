import { Injectable, NotFoundException, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import type { PortfolioDocuments, PublicDocument } from './content.types';
import { contentLocale } from './content.validation';

const DOCUMENTS = {
  'resume.pdf': { key: 'resumePdf', type: 'application/pdf', disposition: 'inline' },
  'resume.docx': { key: 'resumeDocx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', disposition: 'attachment' },
  'portfolio.pdf': { key: 'portfolioPdf', type: 'application/pdf', disposition: 'inline' },
} as const;
type DocumentName = keyof typeof DOCUMENTS;

@Injectable()
export class DocumentsService {
  async metadata(locale: unknown): Promise<PortfolioDocuments> {
    const language = contentLocale(locale);
    const result: PortfolioDocuments = { resumePdf: null, resumeDocx: null, portfolioPdf: null };
    await Promise.all((Object.keys(DOCUMENTS) as DocumentName[]).map(async name => {
      try {
        const file = await this.openDocument(language, name);
        await file.close();
        const metadata: PublicDocument = { url: `/api/documents/files/${language}/${name}`, filename: this.filename(language, name) };
        result[DOCUMENTS[name].key] = metadata;
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
      }
    }));
    return result;
  }

  async download(locale: unknown, name: string): Promise<StreamableFile> {
    const language = contentLocale(locale);
    if (!Object.hasOwn(DOCUMENTS, name)) throw new NotFoundException('Document not found');
    const key = name as DocumentName;
    const file = await this.openDocument(language, key);
    try {
      const stats = await file.stat();
      const document = DOCUMENTS[key];
      return new StreamableFile(file.createReadStream(), {
        type: document.type, length: stats.size,
        disposition: `${document.disposition}; filename="${this.filename(language, key)}"`,
      });
    } catch {
      await file.close();
      throw new ServiceUnavailableException('Documents are temporarily unavailable');
    }
  }

  private filename(language: string, name: DocumentName) {
    const dot = name.lastIndexOf('.');
    return `${name.slice(0, dot)}.${language}${name.slice(dot)}`;
  }

  private async openDocument(language: string, name: DocumentName) {
    const directory = process.env.PORTFOLIO_DOCUMENTS_DIR || join(process.cwd(), 'documents');
    try {
      const file = await open(join(directory, language, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const stats = await file.stat();
        if (!stats.isFile() || stats.size === 0) throw new NotFoundException('Document not found');
      } catch (error) {
        await file.close();
        throw error;
      }
      return file;
    } catch (error) {
      if (error instanceof NotFoundException || ['ENOENT', 'ENOTDIR', 'ELOOP'].includes((error as NodeJS.ErrnoException).code ?? '')) {
        throw new NotFoundException('Document not found');
      }
      throw new ServiceUnavailableException('Documents are temporarily unavailable');
    }
  }
}
