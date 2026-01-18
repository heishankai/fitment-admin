import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Welcome } from './welcome.entity';
import { CreateWelcomeDto } from './dto/create-welcome.dto';
import { UpdateWelcomeDto } from './dto/update-welcome.dto';

@Injectable()
export class WelcomeService {
  constructor(
    @InjectRepository(Welcome)
    private readonly welcomeRepository: Repository<Welcome>,
  ) {}

  /**
   * 获取欢迎页配置（只会有一组数据）
   * @returns 欢迎页配置记录，如果不存在则返回 null
   */
  async getWelcome(): Promise<Welcome | null> {
    try {
      const welcomeConfigs = await this.welcomeRepository.find({
        order: {
          createdAt: 'DESC',
        },
        take: 1,
      });
      return welcomeConfigs.length > 0 ? welcomeConfigs[0] : null;
    } catch (error) {
      throw new BadRequestException('获取欢迎页配置失败: ' + error.message);
    }
  }

  /**
   * 创建欢迎页配置（只会有一组数据，如果已存在则不允许新增）
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreateWelcomeDto): Promise<null> {
    try {
      // 查找是否已存在配置
      const existingWelcomes = await this.welcomeRepository.find({
        order: {
          createdAt: 'DESC',
        },
        take: 1,
      });

      if (existingWelcomes.length > 0) {
        // 如果已存在数据，不允许再新增
        throw new BadRequestException('欢迎页配置已存在，不允许重复创建，请使用更新接口');
      }

      // 如果不存在，则创建
      const welcome = this.welcomeRepository.create(createDto);
      await this.welcomeRepository.save(welcome);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('创建欢迎页配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID更新欢迎页配置
   * @param id 欢迎页配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateWelcomeDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const existingWelcome = await this.welcomeRepository.findOne({
        where: { id },
      });

      if (!existingWelcome) {
        throw new BadRequestException('欢迎页配置记录不存在');
      }

      // 更新记录
      await this.welcomeRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新欢迎页配置失败: ' + error.message);
    }
  }
}
