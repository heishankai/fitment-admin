import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Request,
  HttpException,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { IsVerifiedService } from './is-verified.service';
import { IsVerified } from './is-verified.entity';
import { CreateIsVerifiedDto } from './dto/create-is-verified.dto';
import { UpdateIsVerifiedDto } from './dto/update-is-verified.dto';
import { QueryIsVerifiedDto } from './dto/query-is-verified.dto';

@Controller('is-verified')
export class IsVerifiedController {
  constructor(private readonly isVerifiedService: IsVerifiedService) {}

  /**
   * 分页查询实名认证记录
   * @param queryDto 查询参数 {pageIndex, pageSize, card_name}
   * @returns 分页结果
   */
  @Post('page')
  async getIsVerifiedByPage(
    @Body(ValidationPipe) queryDto: QueryIsVerifiedDto,
  ): Promise<any> {
    return await this.isVerifiedService.getIsVerifiedByPage(queryDto);
  }

  /**
   * 新增实名认证记录
   * @param request 请求对象（包含从token解析的用户信息）
   * @param createIsVerifiedDto 实名认证信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createIsVerified(
    @Request() request: any,
    @Body(ValidationPipe) createIsVerifiedDto: CreateIsVerifiedDto,
  ): Promise<null> {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.isVerifiedService.createIsVerified(
        userId,
        createIsVerifiedDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建实名认证记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据token获取当前用户的实名认证记录
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 实名认证记录（包含用户的 isVerified 状态）
   */
  @Get('my')
  async getMyVerification(
    @Request() request: any,
  ): Promise<(IsVerified & { isVerified: boolean }) | null> {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.isVerifiedService.findByUserIdWithVerified(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取实名认证信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID获取实名认证记录
   * @param id 实名认证ID
   * @returns 实名认证记录
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<IsVerified> {
    return await this.isVerifiedService.findOne(id);
  }

  /**
   * 根据用户ID获取实名认证记录（包含用户的 isVerified 状态）
   * @param userId 用户ID
   * @returns 实名认证记录（包含用户的 isVerified 状态）
   */
  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<(IsVerified & { isVerified: boolean }) | null> {
    return await this.isVerifiedService.findByUserIdWithVerified(userId);
  }

  /**
   * 认证通过，更新用户的 isVerified 状态为 true
   * @param userId 用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('approve/:userId')
  async approveVerification(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<null> {
    return await this.isVerifiedService.approveVerification(userId);
  }

  /**
   * 根据用户ID更新实名认证记录
   * @param userId 用户ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('user/:userId')
  async updateByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) updateDto: UpdateIsVerifiedDto,
  ): Promise<null> {
    return await this.isVerifiedService.updateByUserId(userId, updateDto);
  }

  /**
   * 根据ID更新实名认证记录
   * @param id 实名认证ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateIsVerified(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateIsVerifiedDto,
  ): Promise<null> {
    return await this.isVerifiedService.updateIsVerified(id, updateDto);
  }
}
