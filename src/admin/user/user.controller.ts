import { Controller, Get, Param, Post, Body, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { DeleteResult } from 'typeorm';

@Controller('admin/users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  /**
   * 获取所有用户信息
   * @returns 用户信息
   */
  @Get()
  getAllUser(): Promise<User[]> {
    return this.userService.getAllUser();
  }

  /**
   * 获取用户信息
   * @param id 用户id
   * @returns 用户信息
   */
  @Get(':id')
  getOneUser(@Param('id') id: string): Promise<User | null> {
    return this.userService.getOneUser(+id);
  }

  /**
   * 创建用户
   * @param createUserDto 用户信息
   * @returns 用户信息
   */
  @Post()
  createUser(@Body() body): Promise<User> {
    return this.userService.createUser(body);
  }

  /**
   * 删除用户
   * @param id 用户id
   * @returns 用户信息
   */
  @Delete(':id')
  deleteUser(@Param('id') id: string): Promise<DeleteResult> {
    return this.userService.deleteUser(id);
  }
}
