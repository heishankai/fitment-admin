import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { Activity } from './activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { UpdateSortDto } from './dto/update-sort.dto';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * 查询所有活动列表
   * @returns 活动列表
   */
  @Get()
  async findAll(): Promise<Activity[]> {
    return await this.activityService.findAll();
  }

  /**
   * 根据ID查询活动详情
   * @param id 活动ID
   * @returns 活动详情
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Activity> {
    return await this.activityService.findOne(id);
  }

  /**
   * 创建活动
   * @param createDto 活动信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateActivityDto,
  ): Promise<null> {
    return await this.activityService.create(createDto);
  }

  /**
   * 更新活动排序（拖拽排序）
   * @param updateSortDto 包含排序后的活动ID数组
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put('sort')
  async updateSort(
    @Body(ValidationPipe) updateSortDto: UpdateSortDto,
  ): Promise<null> {
    return await this.activityService.updateSort(updateSortDto.ids);
  }

  /**
   * 根据ID更新活动
   * @param id 活动ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateActivityDto,
  ): Promise<null> {
    return await this.activityService.update(id, updateDto);
  }

  /**
   * 根据ID删除活动
   * @param id 活动ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return await this.activityService.delete(id);
  }
}
