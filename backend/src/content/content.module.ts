import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { DocumentsService } from './documents.service';

@Module({ controllers: [ContentController], providers: [ContentService, DocumentsService] })
export class ContentModule {}
