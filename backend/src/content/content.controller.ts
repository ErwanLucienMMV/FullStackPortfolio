import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { DocumentsService } from './documents.service';

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService, private readonly documents: DocumentsService) {}

  @Get('projets')
  projects(@Query('locale') locale: unknown) {
    return this.content.projects(locale);
  }

  @Get('projets/:category')
  filteredProjects(@Param('category') category: string, @Query('locale') locale: unknown) {
    return this.content.projects(locale, category);
  }

  @Get('diagrams/:name')
  @Header('X-Content-Type-Options', 'nosniff')
  diagram(@Param('name') name: string) {
    return this.content.diagram(name);
  }

  @Get('parcours')
  journey(@Query('locale') locale: unknown) {
    return this.content.journey(locale);
  }

  @Get('skills')
  skills(@Query('locale') locale: unknown) {
    return this.content.skills(locale);
  }

  @Get('documents')
  @Header('Cache-Control', 'no-store')
  documentMetadata(@Query('locale') locale: unknown) {
    return this.documents.metadata(locale);
  }

  @Get('documents/files/:locale/:name')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  download(@Param('locale') locale: string, @Param('name') name: string) {
    return this.documents.download(locale, name);
  }
}
