import { Controller, Get, Param } from '@nestjs/common';

@Controller('admin')
export class AuthController {
  /**
   * 权限
   * @param params
   * @returns
   */
  @Get('/auth')
  auth(): string {
    return `auth`;
  }
}
