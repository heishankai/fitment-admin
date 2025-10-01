import { Injectable } from '@nestjs/common';

/**
 * 一个具有单个方法的基本服务
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!!';
  }

  getGoodbye(): string {
    return 'Goodbye World!!';
  }
}
