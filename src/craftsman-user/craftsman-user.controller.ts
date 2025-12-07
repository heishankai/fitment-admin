import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  HttpException,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CraftsmanUserService } from './craftsman-user.service';
import { LoginDto } from './dto/login.dto';
import { UpdateCraftsmanUserDto } from './dto/update-craftsman-user.dto';
import { QueryCraftsmanUserDto } from './dto/query-craftsman-user.dto';
import { CraftsmanUser } from './craftsman-user.entity';

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

  /**
   * 获取所有工匠用户
   * @returns 所有工匠用户列表
   */
  @Get('all')
  async getAllCraftsmanUsers(): Promise<any> {
    return await this.craftsmanUserService.getAllCraftsmanUsers();
  }

  /**
   * 分页查询工匠用户
   * @param queryDto 查询参数 {pageIndex, pageSize, nickname, phone}
   * @returns 分页结果
   */
  @Public() // 允许微信用户访问，用于选择工匠
  @Post('page')
  async getCraftsmanUsersByPage(
    @Body(ValidationPipe) queryDto: QueryCraftsmanUserDto,
  ): Promise<any> {
    return await this.craftsmanUserService.getCraftsmanUsersByPage(queryDto);
  }

  /**
   * 根据ID获取工匠用户
   * @param id 工匠用户ID
   * @returns 工匠用户信息（包含 isHomePageVerified 和技能信息）
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CraftsmanUser & { isHomePageVerified: boolean; skillInfo: any }> {
    return await this.craftsmanUserService.findOne(id);
  }

  /**
   * 根据ID删除工匠用户
   * @param id 工匠用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async deleteCraftsmanUser(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<null> {
    return await this.craftsmanUserService.deleteCraftsmanUser(id);
  }
}
