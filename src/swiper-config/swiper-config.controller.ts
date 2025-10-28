import {
  Controller,
  Post,
  Get,
  Put,
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
   * 获取轮播图配置
   * @returns 轮播图配置记录
   */
  @Get()
  async getSwiperConfig(): Promise<SwiperConfig | null> {
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
}
