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
    return next.handle().pipe(
      map((data) => {
        // 如果已经是 ApiResponseDto 格式，直接返回
        if (data instanceof ApiResponseDto) {
          return data;
        }

        // 否则包装成成功响应格式
        return ApiResponseDto.success(data, 200);
      }),
    );
  }
}
