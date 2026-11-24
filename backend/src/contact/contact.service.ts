import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const FIELD_LIMITS = { name: 120, email: 254, subject: 200, message: 10_000 } as const;

export function contactMessage(value: unknown): ContactMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !Object.hasOwn(FIELD_LIMITS, key))) {
    throw new BadRequestException('Expected name, email, subject, and message');
  }
  const body = value as Record<string, unknown>;
  const result = {} as ContactMessage;
  const errors: string[] = [];
  for (const key of Object.keys(FIELD_LIMITS) as (keyof ContactMessage)[]) {
    const input = body[key];
    if (typeof input !== 'string' || !input.trim() || input.trim().length > FIELD_LIMITS[key] ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input) || (key !== 'message' && /[\r\n]/.test(input))) {
      errors.push(`${key} must be a nonempty string of at most ${FIELD_LIMITS[key]} characters`);
    } else {
      result[key] = input.trim();
    }
  }
  if (typeof result.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
    errors.push('email must be a valid email address');
  }
  if (errors.length) throw new BadRequestException(errors);
  return result;
}

@Injectable()
export class ContactService {
  async submit(body: unknown): Promise<void> {
    const message = contactMessage(body);
    const destination = process.env.CONTACT_WEBHOOK_URL;
    if (!destination) throw new ServiceUnavailableException('Contact delivery is not configured');
    try {
      const url = new URL(destination);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.hash) {
        throw new Error('Invalid contact destination');
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (process.env.CONTACT_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.CONTACT_WEBHOOK_TOKEN}`;
      const response = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify(message),
        signal: AbortSignal.timeout(10_000), redirect: 'error',
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error('Contact destination rejected message');
    } catch {
      throw new ServiceUnavailableException('Contact delivery is temporarily unavailable');
    }
  }
}
