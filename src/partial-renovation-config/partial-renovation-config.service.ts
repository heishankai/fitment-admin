import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartialRenovationConfig } from './partial-renovation-config.entity';
import { CreatePartialRenovationConfigDto } from './dto/create-partial-renovation-config.dto';
import { QueryPartialRenovationConfigDto } from './dto/query-partial-renovation-config.dto';
import { UpdatePartialRenovationConfigDto } from './dto/update-partial-renovation-config.dto';

@Injectable()
export class PartialRenovationConfigService {
  constructor(
    @InjectRepository(PartialRenovationConfig)
    private readonly partialRenovationConfigRepository: Repository<PartialRenovationConfig>,
  ) {}

  /**
   * 创建局部装修配置
   * @param createDto 创建数据
   * @returns 创建的配置
   */
  async create(createDto: CreatePartialRenovationConfigDto): Promise<null> {
    try {
      // 创建新的案例查询记录
      const partialRenovationConfig =
        this.partialRenovationConfigRepository.create(createDto);

      // 保存到数据库
      await this.partialRenovationConfigRepository.save(partialRenovationConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建局部装修配置失败: ' + error.message);
    }
  }

  /**
   * 分页查询局部装修配置
   * @param queryDto 查询参数 {pageIndex, pageSize, category_name}
   * @returns 分页结果
   */
  async getPartialRenovationConfigsByPage(queryDto: QueryPartialRenovationConfigDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        category_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.partialRenovationConfigRepository.createQueryBuilder('partial_renovation_config');

      // 添加筛选条件
      if (category_name) {
        query.andWhere('partial_renovation_config.category_name LIKE :category_name', {
          category_name: `%${category_name}%`,
        });
      }

      // 计算总数
      const total = await query.getCount();

      // 分页查询
      const data = await query
        .orderBy('partial_renovation_config.createdAt', 'DESC')
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
   * 根据ID获取局部装修配置
   * @param id 局部装修配置ID
   * @returns 局部装修配置记录
   */
  async findOne(id: number): Promise<PartialRenovationConfig> {
    const partialRenovationConfig = await this.partialRenovationConfigRepository.findOne({
      where: { id },
    });

    if (!partialRenovationConfig) {
      throw new BadRequestException('局部装修配置记录不存在');
    }

    return partialRenovationConfig;
  }

  /**
   * 根据ID更新局部装修配置
   * @param id 局部装修配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdatePartialRenovationConfigDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const partialRenovationConfig = await this.partialRenovationConfigRepository.findOne({
        where: { id },
      });

      if (!partialRenovationConfig) {
        throw new BadRequestException('局部装修配置记录不存在');
      }

      // 更新记录
      await this.partialRenovationConfigRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新局部装修配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除局部装修配置
   * @param id 局部装修配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const partialRenovationConfig = await this.partialRenovationConfigRepository.findOne({
        where: { id },
      });

      if (!partialRenovationConfig) {
        throw new BadRequestException('局部装修配置记录不存在');
      }

      // 删除记录
      await this.partialRenovationConfigRepository.remove(partialRenovationConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除局部装修配置失败: ' + error.message);
    }
  }
}
