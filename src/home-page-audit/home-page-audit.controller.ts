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
import { HomePageAuditService } from './home-page-audit.service';
import { HomePageAudit } from './home-page-audit.entity';
import { CreateHomePageAuditDto } from './dto/create-home-page-audit.dto';
import { UpdateHomePageAuditDto } from './dto/update-home-page-audit.dto';
import { QueryHomePageAuditDto } from './dto/query-home-page-audit.dto';

@Controller('home-page-audit')
export class HomePageAuditController {
  constructor(
    private readonly homePageAuditService: HomePageAuditService,
  ) {}

  /**
   * 分页查询首页审核记录
   * @param queryDto 查询参数 {pageIndex, pageSize}
   * @returns 分页结果
   */
  @Post('page')
  async getHomePageAuditByPage(
    @Body(ValidationPipe) queryDto: QueryHomePageAuditDto,
  ): Promise<any> {
    return await this.homePageAuditService.getHomePageAuditByPage(queryDto);
  }

  /**
   * 新增首页审核记录
   * @param request 请求对象（包含从token解析的用户信息）
   * @param createHomePageAuditDto 首页审核信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createHomePageAudit(
    @Request() request: any,
    @Body(ValidationPipe) createHomePageAuditDto: CreateHomePageAuditDto,
  ): Promise<null> {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.homePageAuditService.createHomePageAudit(
        userId,
        createHomePageAuditDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建首页审核记录失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据token获取当前用户的首页审核记录
   * @param request 请求对象（包含从token解析的用户信息）
   * @returns 首页审核记录（包含用户的 isHomePageVerified 状态）
   */
  @Get('my')
  async getMyHomePageAudit(
    @Request() request: any,
  ): Promise<(HomePageAudit & { isHomePageVerified: boolean }) | null> {
    try {
      // 从token中获取userId
      const userId = request.user?.userid || request.user?.userId;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }
      return await this.homePageAuditService.findByUserIdWithToken(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取首页审核信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据ID获取首页审核记录
   * @param id 首页审核ID
   * @returns 首页审核记录
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<HomePageAudit> {
    return await this.homePageAuditService.findOne(id);
  }

  /**
   * 根据用户ID获取首页审核记录
   * @param userId 用户ID
   * @returns 首页审核记录
   */
  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<HomePageAudit | null> {
    return await this.homePageAuditService.findByUserId(userId);
  }

  /**
   * 审核通过，更新用户的 isHomePageVerified 状态为 true
   * @param userId 用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('approve/:userId')
  async approveVerification(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<null> {
    return await this.homePageAuditService.approveVerification(userId);
  }

  /**
   * 审核不通过，更新用户的 isHomePageVerified 状态为 false
   * @param userId 用户ID
   * @param body 拒绝原因（可选）
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('reject/:userId')
  async rejectVerification(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body?: { reason?: string },
  ): Promise<null> {
    return await this.homePageAuditService.rejectVerification(
      userId,
      body?.reason,
    );
  }

  /**
   * 根据用户ID更新首页审核记录
   * @param userId 用户ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('user/:userId')
  async updateByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    return await this.homePageAuditService.updateByUserId(userId, updateDto);
  }

  /**
   * 根据ID更新首页审核记录
   * @param id 首页审核ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async updateHomePageAudit(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    return await this.homePageAuditService.updateHomePageAudit(id, updateDto);
  }
}

