import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // 如果已经是 HttpException，直接抛出
        if (error instanceof HttpException) {
          return throwError(() => error);
        }
        
        // 记录原始错误（用于调试）
        console.error('Unhandled error:', error);
        
        // 转换为 HttpException
        return throwError(() => new HttpException(
          '服务器内部错误',
          HttpStatus.INTERNAL_SERVER_ERROR
        ));
      })
    );
  }
}
