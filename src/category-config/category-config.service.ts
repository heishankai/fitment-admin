import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryConfig } from './category-config.entity';
import { CreateCategoryConfigDto } from './dto/create-category-config.dto';
import { QueryCategoryConfigDto } from './dto/query-category-config.dto';
import { UpdateCategoryConfigDto } from './dto/update-category-config.dto';

@Injectable()
export class CategoryConfigService {
  constructor(
    @InjectRepository(CategoryConfig)
    private readonly categoryConfigRepository: Repository<CategoryConfig>,
  ) {}

  /**
   * 获取所有类目配置
   * @returns 所有类目配置列表
   */
  async getAllCategoryConfigs(): Promise<CategoryConfig[]> {
    try {
      const categoryConfigs = await this.categoryConfigRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      return categoryConfigs;
    } catch (error) {
      throw new BadRequestException('获取类目配置失败: ' + error.message);
    }
  }

  /**
   * 分页查询类目配置
   * @param queryDto 查询参数 {pageIndex, pageSize, category_name}
   * @returns 分页结果
   */
  async getCategoryConfigsByPage(queryDto: QueryCategoryConfigDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        category_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.categoryConfigRepository.createQueryBuilder('category_config');

      // 添加筛选条件
      if (category_name) {
        query.andWhere('category_config.category_name LIKE :category_name', {
          category_name: `%${category_name}%`,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('category_config.createdAt', 'DESC');

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
   * 创建类目配置
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreateCategoryConfigDto): Promise<null> {
    try {
      // 创建新的类目配置记录
      const categoryConfig = this.categoryConfigRepository.create(createDto);

      // 保存到数据库
      await this.categoryConfigRepository.save(categoryConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建类目配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取类目配置
   * @param id 类目配置ID
   * @returns 类目配置记录
   */
  async findOne(id: number): Promise<CategoryConfig> {
    const categoryConfig = await this.categoryConfigRepository.findOne({
      where: { id },
    });

    if (!categoryConfig) {
      throw new BadRequestException('类目配置记录不存在');
    }

    return categoryConfig;
  }

  /**
   * 根据ID更新类目配置
   * @param id 类目配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateCategoryConfigDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const categoryConfig = await this.categoryConfigRepository.findOne({
        where: { id },
      });

      if (!categoryConfig) {
        throw new BadRequestException('类目配置记录不存在');
      }

      // 更新记录
      await this.categoryConfigRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新类目配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除类目配置
   * @param id 类目配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const categoryConfig = await this.categoryConfigRepository.findOne({
        where: { id },
      });

      if (!categoryConfig) {
        throw new BadRequestException('类目配置记录不存在');
      }

      // 删除记录
      await this.categoryConfigRepository.remove(categoryConfig);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除类目配置失败: ' + error.message);
    }
  }
}
