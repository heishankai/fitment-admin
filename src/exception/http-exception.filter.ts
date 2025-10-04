import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../common/dto/response.dto';

/**
 * @全局异常过滤器 用于捕获和处理 HTTP 异常
 * 通过实现 ExceptionFilter 接口，定义 catch 方法来处理异常
 * @Catch(HttpException) 装饰器指定该过滤器只处理 HttpException 类型的异常
 * 在 catch 方法中，获取异常信息和请求上下文，并返回标准化的错误响应
 */

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorMessage = exception.getResponse();
    const message =
      typeof errorMessage === 'string'
        ? errorMessage
        : (errorMessage as any)?.message || '接口错误，请刷新稍后重试';

    const errorResponse = ApiResponseDto.error(status, message);

    response.status(status).json(errorResponse);
  }
}
