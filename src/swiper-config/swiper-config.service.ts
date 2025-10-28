import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwiperConfig } from './swiper-config.entity';
import { CreateSwiperConfigDto } from './dto/create-swiper-config.dto';
import { UpdateSwiperConfigDto } from './dto/update-swiper-config.dto';

@Injectable()
export class SwiperConfigService {
  constructor(
    @InjectRepository(SwiperConfig)
    private readonly swiperConfigRepository: Repository<SwiperConfig>,
  ) {}

  /**
   * 获取轮播图配置（只会有一组数据）
   * @returns 轮播图配置记录
   */
  async getSwiperConfig(): Promise<SwiperConfig | null> {
    try {
      const swiperConfigs = await this.swiperConfigRepository.find({
        order: {
          createdAt: 'DESC',
        },
        take: 1,
      });
      return swiperConfigs.length > 0 ? swiperConfigs[0] : null;
    } catch (error) {
      throw new BadRequestException('获取轮播图配置失败: ' + error.message);
    }
  }

  /**
   * 创建或更新轮播图配置（只会有一组数据）
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async createOrUpdate(createDto: CreateSwiperConfigDto): Promise<null> {
    try {
      // 先查找是否已存在配置
      const existingConfigs = await this.swiperConfigRepository.find({
        order: {
          createdAt: 'DESC',
        },
        take: 1,
      });

      if (existingConfigs.length > 0) {
        // 如果存在，则更新
        await this.swiperConfigRepository.update(existingConfigs[0].id, createDto);
      } else {
        // 如果不存在，则创建
        const swiperConfig = this.swiperConfigRepository.create(createDto);
        await this.swiperConfigRepository.save(swiperConfig);
      }

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建或更新轮播图配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID更新轮播图配置
   * @param id 轮播图配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateSwiperConfigDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const existingConfig = await this.swiperConfigRepository.findOne({
        where: { id },
      });

      if (!existingConfig) {
        throw new BadRequestException('轮播图配置记录不存在');
      }

      // 更新记录
      await this.swiperConfigRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新轮播图配置失败: ' + error.message);
    }
  }
}
