import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkType } from './work-type.entity';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { QueryWorkTypeDto } from './dto/query-work-type.dto';
import { UpdateWorkTypeDto } from './dto/update-work-type.dto';

@Injectable()
export class WorkTypeService {
  constructor(
    @InjectRepository(WorkType)
    private readonly workTypeRepository: Repository<WorkType>,
  ) {}

  /**
   * 分页查询工种类型
   * @param queryDto 查询参数 {pageIndex, pageSize, work_title}
   * @returns 分页结果
   */
  async getWorkTypesByPage(queryDto: QueryWorkTypeDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        work_title = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.workTypeRepository.createQueryBuilder('work_type');

      // 添加筛选条件
      if (work_title) {
        query.andWhere('work_type.work_title LIKE :work_title', {
          work_title: `%${work_title}%`,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('work_type.createdAt', 'DESC');

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
   * 创建工种类型
   * @param createWorkTypeDto 创建工种类型DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createWorkType(createWorkTypeDto: CreateWorkTypeDto): Promise<null> {
    try {
      // 创建新的工种类型记录
      const workType = this.workTypeRepository.create(createWorkTypeDto);

      // 保存到数据库
      await this.workTypeRepository.save(workType);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建工种类型失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取工种类型
   * @param id 工种类型ID
   * @returns 工种类型记录
   */
  async findOne(id: number): Promise<WorkType> {
    const workType = await this.workTypeRepository.findOne({
      where: { id },
    });

    if (!workType) {
      throw new BadRequestException('工种类型不存在');
    }

    return workType;
  }

  /**
   * 根据ID更新工种类型
   * @param id 工种类型ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateWorkType(
    id: number,
    updateDto: UpdateWorkTypeDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const workType = await this.workTypeRepository.findOne({
        where: { id },
      });

      if (!workType) {
        throw new BadRequestException('工种类型不存在');
      }

      // 更新记录
      await this.workTypeRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新工种类型失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除工种类型
   * @param id 工种类型ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteWorkType(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const workType = await this.workTypeRepository.findOne({
        where: { id },
      });

      if (!workType) {
        throw new BadRequestException('工种类型不存在');
      }

      // 删除记录
      await this.workTypeRepository.remove(workType);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除工种类型失败: ' + error.message);
    }
  }
}
