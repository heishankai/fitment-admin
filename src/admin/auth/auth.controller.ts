import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// 导入公共装饰器(允许未登录访问)
import { Public } from './public.decorator';
import { AuthService } from './auth.service';

@Controller('admin/login')
export class AuthController {
  constructor(
    private reflector: Reflector,
    private readonly authService: AuthService,
  ) {}
  /**
   * 登录
   * @method POST
   * @returns 登录结果
   */
  @Public()
  @Post()
  async login(@Body() body: any) {
    try {
      // 基本验证
      if (!body.username || !body.password) {
        throw new HttpException('用户名和密码不能为空', HttpStatus.BAD_REQUEST);
      }

      return await this.authService.login(body.username, body.password);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('登录失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
