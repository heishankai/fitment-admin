import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PlatformNoticeService } from './platform-notice.service';
import { PlatformNotice } from './platform-notice.entity';
import { CreatePlatformNoticeDto } from './dto/create-platform-notice.dto';
import { QueryPlatformNoticeDto } from './dto/query-platform-notice.dto';
import { UpdatePlatformNoticeDto } from './dto/update-platform-notice.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('platform-notice')
export class PlatformNoticeController {
  constructor(private readonly platformNoticeService: PlatformNoticeService) {}

  /**
   * 获取所有平台公告
   * @param notice_type 可选，公告类型：1-用户端公告，2-工匠端公告
   * @returns 所有平台公告列表
   */
  @Get()
  async getAllPlatformNotices(
    @Query('notice_type') notice_type?: string | number,
  ): Promise<PlatformNotice[]> {
    return await this.platformNoticeService.getAllPlatformNotices(notice_type);
  }

  /**
   * 分页查询平台公告
   * @param queryDto 查询参数 {pageIndex, pageSize, date, createTime, notice_title}
   * @returns 分页结果
   */
  @Post('page')
  async getPlatformNoticesByPage(
    @Body(ValidationPipe) queryDto: QueryPlatformNoticeDto,
  ): Promise<any> {
    return await this.platformNoticeService.getPlatformNoticesByPage(queryDto);
  }

  /**
   * 新增平台公告
   * @param createDto 平台公告信息
   * @param req 请求对象，包含用户信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreatePlatformNoticeDto,
    @Request() req: any,
  ): Promise<null> {
    return await this.platformNoticeService.create(createDto);
  }

  /**
   * 根据ID获取平台公告
   * @param id 平台公告ID
   * @returns 平台公告记录
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PlatformNotice> {
    return await this.platformNoticeService.findOne(id);
  }

  /**
   * 根据ID更新平台公告
   * @param id 平台公告ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdatePlatformNoticeDto,
  ): Promise<null> {
    return await this.platformNoticeService.update(id, updateDto);
  }

  /**
   * 根据ID删除平台公告
   * @param id 平台公告ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.platformNoticeService.delete(id);
  }
}
