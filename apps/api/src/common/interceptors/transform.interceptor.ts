import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<Response>();

    // Skip wrapping for direct streaming (e.g. PDF downloads or CSV exports)
    const contentType = res.getHeader('Content-Type') as string;
    if (
      contentType &&
      (contentType.includes('application/pdf') ||
        contentType.includes('text/csv') ||
        contentType.includes('application/octet-stream'))
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already enveloped or null, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return {
          success: true,
          data,
        };
      })
    );
  }
}
