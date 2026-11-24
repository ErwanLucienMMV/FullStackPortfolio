import { Body, Controller, Header, Headers, HttpCode, Post, UnsupportedMediaTypeException } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact-form')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  submit(@Body() body: unknown, @Headers('content-type') contentType?: string) {
    if (contentType?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      throw new UnsupportedMediaTypeException('Content-Type must be application/json');
    }
    return this.contact.submit(body);
  }
}
