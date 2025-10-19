import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommodityConfig } from './commodity-config.entity';
import { CreateCommodityConfigDto } from './dto/create-commodity-config.dto';
import { QueryCommodityConfigDto } from './dto/query-commodity-config.dto';
import { UpdateCommodityConfigDto } from './dto/update-commodity-config.dto';

@Injectable()
export class CommodityConfigService {
  constructor(
    @InjectRepository(CommodityConfig)
    private readonly commodityConfigRepository: Repository<CommodityConfig>,
  ) {}

  /**
   * 获取所有商品配置
   * @returns 所有商品配置列表
   */
  async getAllCommodityConfigs(): Promise<CommodityConfig[]> {
    try {
      const commodityConfigs = await this.commodityConfigRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      return commodityConfigs;
    } catch (error) {
      throw new BadRequestException('获取商品配置失败: ' + error.message);
    }
  }

  /**
   * 分页查询商品配置
   * @param queryDto 查询参数 {pageIndex, pageSize, commodity_name, category_id, category_name}
   * @returns 分页结果
   */
  async getCommodityConfigsByPage(queryDto: QueryCommodityConfigDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        commodity_name = '',
        category_id,
        category_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.commodityConfigRepository.createQueryBuilder('commodity_config');

      // 添加筛选条件
      if (commodity_name) {
        query.andWhere('commodity_config.commodity_name LIKE :commodity_name', {
          commodity_name: `%${commodity_name}%`,
        });
      }

      if (category_id !== undefined && category_id !== null) {
        query.andWhere('commodity_config.category_id = :category_id', {
          category_id,
        });
      }

      if (category_name) {
        query.andWhere('commodity_config.category_name LIKE :category_name', {
          category_name: `%${category_name}%`,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('commodity_config.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
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
   * 创建商品配置
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreateCommodityConfigDto): Promise<null> {
    try {
      // 创建新的商品配置记录
      const commodityConfig = this.commodityConfigRepository.create(createDto);

      // 保存到数据库
      await this.commodityConfigRepository.save(commodityConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建商品配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取商品配置
   * @param id 商品配置ID
   * @returns 商品配置记录
   */
  async findOne(id: number): Promise<CommodityConfig> {
    const commodityConfig = await this.commodityConfigRepository.findOne({
      where: { id },
    });

    if (!commodityConfig) {
      throw new BadRequestException('商品配置记录不存在');
    }

    return commodityConfig;
  }

  /**
   * 根据ID更新商品配置
   * @param id 商品配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateCommodityConfigDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const commodityConfig = await this.commodityConfigRepository.findOne({
        where: { id },
      });

      if (!commodityConfig) {
        throw new BadRequestException('商品配置记录不存在');
      }

      // 更新记录
      await this.commodityConfigRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新商品配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除商品配置
   * @param id 商品配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const commodityConfig = await this.commodityConfigRepository.findOne({
        where: { id },
      });

      if (!commodityConfig) {
        throw new BadRequestException('商品配置记录不存在');
      }

      // 删除记录
      await this.commodityConfigRepository.remove(commodityConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除商品配置失败: ' + error.message);
    }
  }
}
