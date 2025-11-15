import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkKind } from './work-kind.entity';
import { CreateWorkKindDto } from './dto/create-work-kind.dto';
import { QueryWorkKindDto } from './dto/query-work-kind.dto';
import { UpdateWorkKindDto } from './dto/update-work-kind.dto';

@Injectable()
export class WorkKindService {
  constructor(
    @InjectRepository(WorkKind)
    private readonly workKindRepository: Repository<WorkKind>,
  ) {}

  /**
   * 获取所有工种配置
   * @returns 所有工种配置列表
   */
  async getAllWorkKinds(): Promise<WorkKind[]> {
    try {
      const workKinds = await this.workKindRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      return workKinds;
    } catch (error) {
      throw new BadRequestException('获取工种配置失败: ' + error.message);
    }
  }

  /**
   * 分页查询工种配置
   * @param queryDto 查询参数 {pageIndex, pageSize, work_kind_name}
   * @returns 分页结果
   */
  async getWorkKindsByPage(queryDto: QueryWorkKindDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        work_kind_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.workKindRepository.createQueryBuilder('work_kind');

      // 添加筛选条件
      if (work_kind_name) {
        query.andWhere('work_kind.work_kind_name LIKE :work_kind_name', {
          work_kind_name: `%${work_kind_name}%`,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('work_kind.createdAt', 'DESC');

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
   * 创建工种配置
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreateWorkKindDto): Promise<null> {
    try {
      // 创建新的工种配置记录
      const workKind = this.workKindRepository.create(createDto);

      // 保存到数据库
      await this.workKindRepository.save(workKind);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建工种配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取工种配置
   * @param id 工种配置ID
   * @returns 工种配置记录
   */
  async findOne(id: number): Promise<WorkKind> {
    const workKind = await this.workKindRepository.findOne({
      where: { id },
    });

    if (!workKind) {
      throw new BadRequestException('工种配置记录不存在');
    }

    return workKind;
  }

  /**
   * 根据ID更新工种配置
   * @param id 工种配置ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateWorkKindDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const workKind = await this.workKindRepository.findOne({
        where: { id },
      });

      if (!workKind) {
        throw new BadRequestException('工种配置记录不存在');
      }

      // 更新记录
      await this.workKindRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新工种配置失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除工种配置
   * @param id 工种配置ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const workKind = await this.workKindRepository.findOne({
        where: { id },
      });

      if (!workKind) {
        throw new BadRequestException('工种配置记录不存在');
      }

      // 删除记录
      await this.workKindRepository.remove(workKind);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除工种配置失败: ' + error.message);
    }
  }
}

