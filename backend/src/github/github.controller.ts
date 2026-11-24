import { Controller, Get, Header } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('stats/github')
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  stats() {
    return this.github.stats();
  }

  @Get('languages')
  @Header('Cache-Control', 'no-store')
  languages() {
    return this.github.languages();
  }
}
