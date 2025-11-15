import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabourCost } from './labour-cost.entity';
import { CreateLabourCostDto } from './dto/create-labour-cost.dto';
import { QueryLabourCostDto } from './dto/query-labour-cost.dto';
import { UpdateLabourCostDto } from './dto/update-labour-cost.dto';

@Injectable()
export class LabourCostService {
  constructor(
    @InjectRepository(LabourCost)
    private readonly labourCostRepository: Repository<LabourCost>,
  ) {}

  /**
   * 获取所有人工成本配置
   * @returns 所有人工成本配置列表
   */
  async getAllLabourCosts(): Promise<LabourCost[]> {
    try {
      const labourCosts = await this.labourCostRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      return labourCosts;
    } catch (error) {
      throw new BadRequestException('获取人工成本配置失败: ' + error.message);
    }
  }

  /**
   * 分页查询人工成本配置
   * @param queryDto 查询参数 {pageIndex, pageSize, labour_cost_name}
   * @returns 分页结果
   */
  async getLabourCostsByPage(queryDto: QueryLabourCostDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        labour_cost_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.labourCostRepository.createQueryBuilder('labour_cost');

      // 添加筛选条件
      if (labour_cost_name) {
        query.andWhere('labour_cost.labour_cost_name LIKE :labour_cost_name', {
          labour_cost_name: `%${labour_cost_name}%`,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('labour_cost.createdAt', 'DESC');

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
   * 创建人工成本配置
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreateLabourCostDto): Promise<null> {
    try {
      // 创建新的人工成本配置记录
      const labourCost = this.labourCostRepository.create(createDto);

      // 保存到数据库
      await this.labourCostRepository.save(labourCost);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建人工成本配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取人工成本配置
   * @param id 人工成本配置ID
   * @returns 人工成本配置记录
   */
  async findOne(id: number): Promise<LabourCost> {
    const labourCost = await this.labourCostRepository.findOne({
      where: { id },
    });

    if (!labourCost) {
      throw new BadRequestException('人工成本配置记录不存在');
    }

    return labourCost;
  }

  /**
   * 根据ID更新人工成本配置
   * @param id 人工成本配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateLabourCostDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const labourCost = await this.labourCostRepository.findOne({
        where: { id },
      });

      if (!labourCost) {
        throw new BadRequestException('人工成本配置记录不存在');
      }

      // 更新记录
      await this.labourCostRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新人工成本配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除人工成本配置
   * @param id 人工成本配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const labourCost = await this.labourCostRepository.findOne({
        where: { id },
      });

      if (!labourCost) {
        throw new BadRequestException('人工成本配置记录不存在');
      }

      // 删除记录
      await this.labourCostRepository.remove(labourCost);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除人工成本配置失败: ' + error.message);
    }
  }
}

