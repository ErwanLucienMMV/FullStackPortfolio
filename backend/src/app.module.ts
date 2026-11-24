import { Controller, Get, Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { ContentModule } from './content/content.module';
import { GithubModule } from './github/github.module';

@Controller()
class AppController {
  @Get()
  status() {
    return { status: 'ok' };
  }
}

@Module({ imports: [GithubModule, ContentModule, ContactModule], controllers: [AppController] })
export class AppModule {}
