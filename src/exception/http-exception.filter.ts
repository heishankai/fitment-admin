import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    response.status(status).json({
      statusCode: status || 500,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.getResponse() || '接口错误，请刷新稍后重试',
    });
  }
}
