import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/response.dto';

/**
 * 响应拦截器 - 统一格式化所有成功响应
 * 自动将控制器返回的数据包装成统一的成功响应格式
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map((data) => {
        // 如果响应已经发送（例如文件下载），直接返回数据，不进行包装
        if (response.headersSent) {
          return data;
        }

        // 如果响应类型是 blob（文件下载），直接返回数据
        const contentType = response.getHeader('Content-Type');
        if (
          contentType &&
          (contentType.toString().includes('application/vnd.openxmlformats') ||
            contentType.toString().includes('application/octet-stream') ||
            contentType.toString().includes('application/pdf'))
        ) {
          return data;
        }

        // 如果已经是 ApiResponseDto 格式，直接返回
        if (data instanceof ApiResponseDto) {
          return data;
        }

        // 如果数据已经是完整的响应格式（包含success、code、message等字段），直接返回
        if (data && typeof data === 'object' && 'success' in data && 'code' in data) {
          return data;
        }

        // 否则包装成成功响应格式
        return ApiResponseDto.success(data, 200);
      }),
    );
  }
}
