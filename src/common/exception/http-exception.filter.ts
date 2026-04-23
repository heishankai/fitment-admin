import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseDto } from '../dto/response.dto';

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
    const status = exception.getStatus();

    const errorMessage = exception.getResponse();
    let message: string;

    if (typeof errorMessage === 'string') {
      message = errorMessage;
    } else {
      const errorObj = errorMessage as any;
      // 处理验证错误：只返回第一个错误，避免一次性返回所有校验失败信息
      if (Array.isArray(errorObj?.message)) {
        message = errorObj.message[0] || '参数校验失败';
      } else {
        message = errorObj?.message || '接口错误，请刷新稍后重试';
      }
    }

    const errorResponse = ApiResponseDto.error(status, message);

    response.status(status).json(errorResponse);
  }
}
