import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CraftsmanQuery } from './craftsman-query.entity';
import { CreateCraftsmanQueryDto } from './dto/create-craftsman-query.dto';
import { QueryCraftsmanQueryDto } from './dto/query-craftsman-query.dto';
import { UpdateCraftsmanQueryDto } from './dto/update-craftsman-query.dto';

@Injectable()
export class CraftsmanQueryService {
  constructor(
    @InjectRepository(CraftsmanQuery)
    private readonly craftsmanQueryRepository: Repository<CraftsmanQuery>,
  ) {}

  /**
   * 分页查询工匠查询记录
   * @param queryDto 查询参数 {pageIndex, pageSize, craftsman_name, craftsman_skill, city_name, city_code}
   * @returns 分页结果
   */
  async getCraftsmanQueriesByPage(queryDto: QueryCraftsmanQueryDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        craftsman_name = '',
        craftsman_skill = '',
        city_name = '',
        city_code = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.craftsmanQueryRepository.createQueryBuilder('craftsman_query');

      // 添加筛选条件
      if (craftsman_name) {
        query.andWhere('craftsman_query.craftsman_name LIKE :craftsman_name', {
          craftsman_name: `%${craftsman_name}%`,
        });
      }
      if (craftsman_skill) {
        query.andWhere('craftsman_query.craftsman_skill LIKE :craftsman_skill', {
          craftsman_skill: `%${craftsman_skill}%`,
        });
      }
      if (city_name) {
        query.andWhere('craftsman_query.city_name = :city_name', {
          city_name,
        });
      }
      if (city_code) {
        query.andWhere('craftsman_query.city_code = :city_code', {
          city_code,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('craftsman_query.createdAt', 'DESC');

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
   * 创建工匠查询记录
   * @param createCraftsmanQueryDto 创建工匠查询DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createCraftsmanQuery(createCraftsmanQueryDto: CreateCraftsmanQueryDto): Promise<null> {
    try {
      // 创建新的工匠查询记录
      const craftsmanQuery = this.craftsmanQueryRepository.create(createCraftsmanQueryDto);

      // 保存到数据库
      await this.craftsmanQueryRepository.save(craftsmanQuery);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建工匠查询失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取工匠查询记录
   * @param id 工匠查询ID
   * @returns 工匠查询记录
   */
  async findOne(id: number): Promise<CraftsmanQuery> {
    const craftsmanQuery = await this.craftsmanQueryRepository.findOne({
      where: { id },
    });

    if (!craftsmanQuery) {
      throw new BadRequestException('工匠查询记录不存在');
    }

    return craftsmanQuery;
  }

  /**
   * 根据ID更新工匠查询记录
   * @param id 工匠查询ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateCraftsmanQuery(
    id: number,
    updateDto: UpdateCraftsmanQueryDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const craftsmanQuery = await this.craftsmanQueryRepository.findOne({
        where: { id },
      });

      if (!craftsmanQuery) {
        throw new BadRequestException('工匠查询记录不存在');
      }

      // 更新记录
      await this.craftsmanQueryRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新工匠查询记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除工匠查询记录
   * @param id 工匠查询ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteCraftsmanQuery(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const craftsmanQuery = await this.craftsmanQueryRepository.findOne({
        where: { id },
      });

      if (!craftsmanQuery) {
        throw new BadRequestException('工匠查询记录不存在');
      }

      // 删除记录
      await this.craftsmanQueryRepository.remove(craftsmanQuery);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除工匠查询记录失败: ' + error.message);
    }
  }
}
