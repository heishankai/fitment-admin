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
import { HomePageAuditService } from './home-page-audit.service';
import { HomePageAudit } from './home-page-audit.entity';
import { CreateHomePageAuditDto } from './dto/create-home-page-audit.dto';
import { UpdateHomePageAuditDto } from './dto/update-home-page-audit.dto';
import { QueryHomePageAuditDto } from './dto/query-home-page-audit.dto';
import { QueryMyWorksDto } from './dto/query-my-works.dto';

@Controller('home-page-audit')
export class HomePageAuditController {
  constructor(
    private readonly homePageAuditService: HomePageAuditService,
  ) {}

  /**
   * 分页查询首页审核记录
   */
  @Post('page')
  async getHomePageAuditByPage(
    @Body(ValidationPipe) queryDto: QueryHomePageAuditDto,
  ): Promise<any> {
    return await this.homePageAuditService.getHomePageAuditByPage(queryDto);
  }

  /**
   * 新增首页审核记录
   */
  @Post()
  async createHomePageAudit(
    @Request() request: any,
    @Body(ValidationPipe) createHomePageAuditDto: CreateHomePageAuditDto,
  ): Promise<null> {
    try {
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
   * 分页查询当前用户的所有作品
   * @param request 请求对象（包含从token解析的用户信息）
   * @param queryDto 分页参数 {pageIndex, pageSize, status}
   */
  @Post('my/page')
  async getMyWorksByPage(
    @Request() request: any,
    @Body(ValidationPipe) queryDto: QueryMyWorksDto,
  ): Promise<any> {
    const userId = request.user?.userid || request.user?.userId;
    if (!userId) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    return await this.homePageAuditService.getMyWorksByPage(userId, queryDto);
  }

  /**
   * 根据token获取当前用户的所有首页审核记录
   */
  @Get('my')
  async getMyHomePageAudit(
    @Request() request: any,
  ): Promise<HomePageAudit[]> {
    try {
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
   * 根据工匠用户ID获取全部审核通过（已发布）的作品
   */
  @Get('user/:userId/published')
  async findPublishedWorksByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<HomePageAudit[]> {
    return await this.homePageAuditService.findPublishedWorksByUserId(userId);
  }

  /**
   * 根据用户ID获取该工匠的所有首页审核记录（需在 :id 之前定义，避免路由冲突）
   */
  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<HomePageAudit[]> {
    return await this.homePageAuditService.findByUserId(userId);
  }

  /**
   * 根据ID获取首页审核记录
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<HomePageAudit> {
    return await this.homePageAuditService.findOne(id);
  }

  /**
   * 审核通过（按用户ID，审核该用户最新的一条记录）- 需在 approve/:id 之前定义
   * @param userId 工匠用户ID
   */
  @Put('approve/user/:userId')
  async approveVerificationByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<null> {
    return await this.homePageAuditService.approveVerificationByUserId(userId);
  }

  /**
   * 审核通过（按记录ID）
   * @param id 首页审核记录ID
   */
  @Put('approve/:id')
  async approveVerification(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<null> {
    return await this.homePageAuditService.approveVerificationById(id);
  }

  /**
   * 审核不通过（按用户ID，拒绝该用户最新的一条记录）- 需在 reject/:id 之前定义
   * @param userId 工匠用户ID
   */
  @Put('reject/user/:userId')
  async rejectVerificationByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body?: { reason?: string },
  ): Promise<null> {
    return await this.homePageAuditService.rejectVerificationByUserId(userId, body?.reason);
  }

  /**
   * 审核不通过（按记录ID）
   * @param id 首页审核记录ID
   * @param body 拒绝原因（可选）
   */
  @Put('reject/:id')
  async rejectVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { reason?: string },
  ): Promise<null> {
    return await this.homePageAuditService.rejectVerification(id, body?.reason);
  }

  /**
   * 根据ID删除首页审核记录
   */
  @Delete(':id')
  async deleteHomePageAudit(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<null> {
    return await this.homePageAuditService.deleteHomePageAudit(id);
  }

  /**
   * 根据用户ID更新首页审核记录
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
   */
  @Put(':id')
  async updateHomePageAudit(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    return await this.homePageAuditService.updateHomePageAudit(id, updateDto);
  }
}
