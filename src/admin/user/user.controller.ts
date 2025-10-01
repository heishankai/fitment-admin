import { Controller, Get, Param } from '@nestjs/common';

@Controller('admin')
export class UserController {
  /**
   * 获取用户信息
   * @param params
   * @returns
   */
  @Get('/user/:id')
  getUser(@Param('id') id): string {
    console.log('params', id);
    return `get user info ${JSON.stringify(id)}`;
  }
}
