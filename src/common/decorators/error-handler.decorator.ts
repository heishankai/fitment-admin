import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 错误处理装饰器
 * 自动捕获方法中的异常并转换为 HttpException
 */
export function HandleError(errorMessage: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(errorMessage, statusCode);
      }
    };
  };
}
