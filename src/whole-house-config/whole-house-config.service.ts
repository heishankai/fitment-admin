import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WholeHouseConfig } from './whole-house-config.entity';
import { CreateWholeHouseConfigDto } from './dto/create-whole-house-config.dto';
import { QueryWholeHouseConfigDto } from './dto/query-whole-house-config.dto';
import { UpdateWholeHouseConfigDto } from './dto/update-whole-house-config.dto';

@Injectable()
export class WholeHouseConfigService {
  constructor(
    @InjectRepository(WholeHouseConfig)
    private readonly wholeHouseConfigRepository: Repository<WholeHouseConfig>,
  ) {}

  /**
   * 创建全屋配置
   * @param createDto 创建数据
   * @returns 创建的配置
   */
  async create(createDto: CreateWholeHouseConfigDto): Promise<null> {
    try {
      // 创建新的案例查询记录
      const wholeHouseConfig =
        this.wholeHouseConfigRepository.create(createDto);

      // 保存到数据库
      await this.wholeHouseConfigRepository.save(wholeHouseConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建全屋配置失败: ' + error.message);
    }
  }

  /**
   * 分页查询全屋配置
   * @param queryDto 查询参数 {pageIndex, pageSize, category_name}
   * @returns 分页结果
   */
  async getWholeHouseConfigsByPage(queryDto: QueryWholeHouseConfigDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        category_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.wholeHouseConfigRepository.createQueryBuilder('whole_house_config');

      // 添加筛选条件
      if (category_name) {
        query.andWhere('whole_house_config.category_name LIKE :category_name', {
          category_name: `%${category_name}%`,
        });
      }

      // 计算总数
      const total = await query.getCount();

      // 分页查询
      const data = await query
        .orderBy('whole_house_config.createdAt', 'DESC')
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 返回结果（包含分页信息的完整格式）
      return {
        success: true,
        data,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('分页查询错误:', error);
      return {
        success: false,
        data: null,
        code: 500,
        message: '分页查询失败: ' + error.message,
        pageIndex: 1,
        pageSize: 10,
        total: 0,
        pageTotal: 0,
      };
    }
  }

  /**
   * 根据ID获取全屋配置
   * @param id 全屋配置ID
   * @returns 全屋配置记录
   */
  async findOne(id: number): Promise<WholeHouseConfig> {
    const wholeHouseConfig = await this.wholeHouseConfigRepository.findOne({
      where: { id },
    });

    if (!wholeHouseConfig) {
      throw new BadRequestException('全屋配置记录不存在');
    }

    return wholeHouseConfig;
  }

  /**
   * 根据ID更新全屋配置
   * @param id 全屋配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateWholeHouseConfigDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const wholeHouseConfig = await this.wholeHouseConfigRepository.findOne({
        where: { id },
      });

      if (!wholeHouseConfig) {
        throw new BadRequestException('全屋配置记录不存在');
      }

      // 更新记录
      await this.wholeHouseConfigRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新全屋配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除全屋配置
   * @param id 全屋配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const wholeHouseConfig = await this.wholeHouseConfigRepository.findOne({
        where: { id },
      });

      if (!wholeHouseConfig) {
        throw new BadRequestException('全屋配置记录不存在');
      }

      // 删除记录
      await this.wholeHouseConfigRepository.remove(wholeHouseConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除全屋配置失败: ' + error.message);
    }
  }
}
