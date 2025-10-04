import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { DeleteResult } from 'typeorm';

@Controller('admin/users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  /**
   * 获取所有用户信息
   * @returns 用户信息列表
   */
  @Get()
  async getAllUser(): Promise<User[]> {
    try {
      return await this.userService.getAllUser();
    } catch (error) {
      throw new HttpException(
        '获取用户列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取用户信息
   * @param id 用户id
   * @returns 用户信息
   */
  @Get(':id')
  async getOneUser(@Param('id') id: string): Promise<User | null> {
    try {
      const user = await this.userService.getOneUser(+id);
      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }
      return user;
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
   * 创建用户
   * @param body 用户信息
   * @returns 用户信息
   */
  @Post()
  async createUser(@Body() body): Promise<User> {
    try {
      // 基本验证
      if (!body.username || !body.password) {
        throw new HttpException('用户名和密码不能为空', HttpStatus.BAD_REQUEST);
      }

      // 检查用户名是否已存在
      const existingUser = await this.userService.findByUsername(body.username);
      if (existingUser) {
        throw new HttpException('用户名已存在', HttpStatus.CONFLICT);
      }

      return await this.userService.createUser(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('创建用户失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 删除用户
   * @param id 用户id
   * @returns 删除结果
   */
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<DeleteResult> {
    try {
      // 检查用户是否存在
      const user = await this.userService.getOneUser(+id);
      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      const result = await this.userService.deleteUser(id);
      if (result.affected === 0) {
        throw new HttpException(
          '删除用户失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('删除用户失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
