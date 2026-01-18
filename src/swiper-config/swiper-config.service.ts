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
   * 获取轮播图配置列表
   * @returns 轮播图配置记录数组
   */
  async getSwiperConfig(): Promise<SwiperConfig[]> {
    try {
      const swiperConfigs = await this.swiperConfigRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      return swiperConfigs;
    } catch (error) {
      throw new BadRequestException('获取轮播图配置失败: ' + error.message);
    }
  }

  /**
   * 创建轮播图配置
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async createOrUpdate(createDto: CreateSwiperConfigDto): Promise<null> {
    try {
      // 创建新的轮播图配置
      const swiperConfig = this.swiperConfigRepository.create(createDto);
      await this.swiperConfigRepository.save(swiperConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建轮播图配置失败: ' + error.message);
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

  /**
   * 根据ID删除轮播图配置
   * @param id 轮播图配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const existingConfig = await this.swiperConfigRepository.findOne({
        where: { id },
      });

      if (!existingConfig) {
        throw new BadRequestException('轮播图配置记录不存在');
      }

      // 删除记录
      await this.swiperConfigRepository.delete(id);

      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除轮播图配置失败: ' + error.message);
    }
  }

  /**
   * 删除所有轮播图配置
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteAll(): Promise<null> {
    try {
      await this.swiperConfigRepository.clear();
      return null;
    } catch (error) {
      throw new BadRequestException('删除所有轮播图配置失败: ' + error.message);
    }
  }
}
