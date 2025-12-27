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
import { IsSkillVerifiedService } from './is-skill-verified.service';
import { IsSkillVerified } from './is-skill-verified.entity';
import { CreateIsSkillVerifiedDto } from './dto/create-is-skill-verified.dto';
import { UpdateIsSkillVerifiedDto } from './dto/update-is-skill-verified.dto';
import { QueryIsSkillVerifiedDto } from './dto/query-is-skill-verified.dto';

@Controller('is-skill-verified')
export class IsSkillVerifiedController {
  constructor(
    private readonly isSkillVerifiedService: IsSkillVerifiedService,
  ) {}

  /**
   * 分页查询技能认证记录
   * @param queryDto 查询参数 {pageIndex, pageSize, workKindId}
   * @returns 分页结果
   */
  @Post('page')
  async getIsSkillVerifiedByPage(
    @Body(ValidationPipe) queryDto: QueryIsSkillVerifiedDto,
  ): Promise<any> {
    return await this.isSkillVerifiedService.getIsSkillVerifiedByPage(queryDto);
  }

  /**
   * 新增技能认证记录
   * @param request 请求对象（包含从token解析的用户信息）
   * @param createIsSkillVerifiedDto 技能认证信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createIsSkillVerified(
    @Request() request: any,
    @Body(ValidationPipe) createIsSkillVerifiedDto: CreateIsSkillVerifiedDto,
  ): Promise<null> {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.isSkillVerifiedService.createIsSkillVerified(
        userId,
        createIsSkillVerifiedDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建技能认证记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据token获取当前用户的技能认证记录
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 技能认证记录（包含用户的 isSkillVerified 状态）
   */
  @Get('my')
  async getMySkillVerification(
    @Request() request: any,
  ): Promise<(IsSkillVerified & { isSkillVerified: boolean }) | null> {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.isSkillVerifiedService.findByUserIdWithVerified(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取技能认证信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID获取技能认证记录
   * @param id 技能认证ID
   * @returns 技能认证记录
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<IsSkillVerified> {
    return await this.isSkillVerifiedService.findOne(id);
  }

  /**
   * 根据用户ID获取技能认证记录（包含用户的 isSkillVerified 状态）
   * @param userId 用户ID
   * @returns 技能认证记录（包含用户的 isSkillVerified 状态）
   */
  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<(IsSkillVerified & { isSkillVerified: boolean }) | null> {
    return await this.isSkillVerifiedService.findByUserIdWithVerified(userId);
  }

  /**
   * 认证通过，更新用户的 isSkillVerified 状态为 true
   * @param userId 用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('approve/:userId')
  async approveVerification(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<null> {
    return await this.isSkillVerifiedService.approveVerification(userId);
  }

  /**
   * 认证不通过，更新用户的 isSkillVerified 状态为 false，并删除技能认证记录
   * @param userId 用户ID
   * @param body 拒绝原因（可选）
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('reject/:userId')
  async rejectVerification(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body?: { reason?: string },
  ): Promise<null> {
    return await this.isSkillVerifiedService.rejectVerification(
      userId,
      body?.reason,
    );
  }

  /**
   * 根据用户ID更新技能认证记录
   * @param userId 用户ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('user/:userId')
  async updateByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) updateDto: UpdateIsSkillVerifiedDto,
  ): Promise<null> {
    return await this.isSkillVerifiedService.updateByUserId(userId, updateDto);
  }

  /**
   * 根据ID更新技能认证记录
   * @param id 技能认证ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateIsSkillVerified(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateIsSkillVerifiedDto,
  ): Promise<null> {
    return await this.isSkillVerifiedService.updateIsSkillVerified(
      id,
      updateDto,
    );
  }
}
