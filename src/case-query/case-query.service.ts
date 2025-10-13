import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaseQuery } from './case-query.entity';
import { CreateCaseQueryDto } from './dto/create-case-query.dto';
import { QueryCaseQueryDto } from './dto/query-case-query.dto';
import { UpdateCaseQueryDto } from './dto/update-case-query.dto';

@Injectable()
export class CaseQueryService {
  constructor(
    @InjectRepository(CaseQuery)
    private readonly caseQueryRepository: Repository<CaseQuery>,
  ) {}

  /**
   * 分页查询案例查询记录
   * @param queryDto 查询参数 {pageIndex, pageSize, housing_name, city_code, housing_type, city_name}
   * @returns 分页结果
   */
  async getCaseQueriesByPage(queryDto: QueryCaseQueryDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        housing_name = '',
        city_code = '',
        housing_type = '',
        city_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.caseQueryRepository.createQueryBuilder('case_query');

      // 添加筛选条件
      if (housing_name) {
        query.andWhere('case_query.housing_name LIKE :housing_name', {
          housing_name: `%${housing_name}%`,
        });
      }
      if (city_code) {
        query.andWhere('case_query.city_code = :city_code', {
          city_code,
        });
      }
      if (housing_type) {
        query.andWhere('case_query.housing_type LIKE :housing_type', {
          housing_type: `%${housing_type}%`,
        });
      }
      if (city_name) {
        query.andWhere('case_query.city_name = :city_name', {
          city_name,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('case_query.createdAt', 'DESC');

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
   * 创建案例查询记录
   * @param createCaseQueryDto 创建案例查询DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createCaseQuery(createCaseQueryDto: CreateCaseQueryDto): Promise<null> {
    try {
      // 创建新的案例查询记录
      const caseQuery = this.caseQueryRepository.create(createCaseQueryDto);

      // 保存到数据库
      await this.caseQueryRepository.save(caseQuery);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建案例查询失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取案例查询记录
   * @param id 案例查询ID
   * @returns 案例查询记录
   */
  async findOne(id: number): Promise<CaseQuery> {
    const caseQuery = await this.caseQueryRepository.findOne({
      where: { id },
    });

    if (!caseQuery) {
      throw new BadRequestException('案例查询记录不存在');
    }

    return caseQuery;
  }

  /**
   * 根据ID更新案例查询记录
   * @param id 案例查询ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateCaseQuery(
    id: number,
    updateDto: UpdateCaseQueryDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const caseQuery = await this.caseQueryRepository.findOne({
        where: { id },
      });

      if (!caseQuery) {
        throw new BadRequestException('案例查询记录不存在');
      }

      // 更新记录
      await this.caseQueryRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新案例查询记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除案例查询记录
   * @param id 案例查询ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteCaseQuery(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const caseQuery = await this.caseQueryRepository.findOne({
        where: { id },
      });

      if (!caseQuery) {
        throw new BadRequestException('案例查询记录不存在');
      }

      // 删除记录
      await this.caseQueryRepository.remove(caseQuery);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除案例查询记录失败: ' + error.message);
    }
  }
}
