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
import { SwiperConfigService } from './swiper-config.service';
import { SwiperConfig } from './swiper-config.entity';
import { CreateSwiperConfigDto } from './dto/create-swiper-config.dto';
import { UpdateSwiperConfigDto } from './dto/update-swiper-config.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('swiper-config')
export class SwiperConfigController {
  constructor(private readonly swiperConfigService: SwiperConfigService) {}

  /**
   * 获取轮播图配置列表
   * @returns 轮播图配置记录数组
   */
  @Get()
  async getSwiperConfig(): Promise<SwiperConfig[]> {
    return await this.swiperConfigService.getSwiperConfig();
  }

  /**
   * 创建或更新轮播图配置（只会有一组数据）
   * @param createDto 轮播图配置信息
   * @returns null，由全局拦截器包装成标准响应
   */
  @Post()
  async createOrUpdate(
    @Body(ValidationPipe) createDto: CreateSwiperConfigDto,
  ): Promise<null> {
    return await this.swiperConfigService.createOrUpdate(createDto);
  }

  /**
   * 根据ID更新轮播图配置
   * @param id 轮播图配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateSwiperConfigDto,
  ): Promise<null> {
    return await this.swiperConfigService.update(id, updateDto);
  }

  /**
   * 根据ID删除轮播图配置
   * @param id 轮播图配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<null> {
    return await this.swiperConfigService.delete(id);
  }

  /**
   * 删除所有轮播图配置
   * @returns null，由全局拦截器包装成标准响应
   */
  @Delete('all')
  async deleteAll(): Promise<null> {
    return await this.swiperConfigService.deleteAll();
  }
}
