import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CraftsmanUserService } from './craftsman-user.service';
import { LoginDto } from './dto/login.dto';
import { UpdateCraftsmanUserDto } from './dto/update-craftsman-user.dto';

@Controller('craftsman-user')
export class CraftsmanUserController {
  constructor(private readonly craftsmanUserService: CraftsmanUserService) {}

  /**
   * 手机号验证码登录/注册
   * @param body { phone: string, code: string }
   * @returns 用户信息（包含token）
   */
  @Public()
  @Post('login')
  async loginOrRegister(@Body() body: LoginDto) {
    try {
      return await this.craftsmanUserService.loginOrRegister(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('登录失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 根据token获取用户信息
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 用户信息
   */
  @Get()
  async getUserInfo(@Request() request: any) {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.craftsmanUserService.getUserInfo(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取用户信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 更新用户信息
   * @param request 请求对象（包含从token解析的用户信息）
   * @param body 更新数据（nickname 和 avatar 都是可选的）
   * @returns 更新成功消息
   */
  @Put()
  async updateUserInfo(
    @Request() request: any,
    @Body() body: UpdateCraftsmanUserDto,
  ) {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.craftsmanUserService.updateUserInfo(userId, body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '更新用户信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
