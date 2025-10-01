import { Injectable } from '@nestjs/common';

/**
 * 一个具有单个方法的基本服务
 */
@Injectable()
export class TestService {
  getData(): string {
    return '666';
  }
}
