import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkType } from './work-type.entity';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { QueryWorkTypeDto } from './dto/query-work-type.dto';
import { UpdateWorkTypeDto } from './dto/update-work-type.dto';
import { Cache, RedisService } from '../common/redis';

/** 与 @Cache 在 {@link WorkTypeService.getWorkTypesByPageInternal} 上生成的 key 一致 */
const WORK_TYPE_PAGE_CACHE_PATTERN =
  'cache:WorkTypeService:getWorkTypesByPageInternal:*';

const normalizeSortValue = (sort: unknown): number => {
  const value = Number(sort);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
};

const normalizeCodeValue = (code?: string | null): string | null | undefined => {
  if (code === undefined) {
    return undefined;
  }
  const trimmed = code?.trim();
  return trimmed ? trimmed : null;
};

@Injectable()
export class WorkTypeService {
  constructor(
    @InjectRepository(WorkType)
    private readonly workTypeRepository: Repository<WorkType>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 分页查询工种类型
   * @param queryDto 查询参数 {pageIndex, pageSize, work_title}
   * @returns 分页结果
   */
  async getWorkTypesByPage(queryDto: QueryWorkTypeDto): Promise<any> {
    try {
      return await this.getWorkTypesByPageInternal(queryDto);
    } catch (error) {
      console.error('分页查询错误:', error);
      return {
        success: false,
        data: null,
        code: 500,
        message: '分页查询失败: ' + (error as Error).message,
        pageIndex: 1,
        pageSize: 10,
        total: 0,
        pageTotal: 0,
      };
    }
  }

  /**
   * 仅成功结果进入 Redis 缓存，失败抛错由外层转统一错误体。
   */
  @Cache(120)
  private async getWorkTypesByPageInternal(
    queryDto: QueryWorkTypeDto,
  ): Promise<any> {
    const {
      pageIndex = 1,
      pageSize = 10,
      work_title = '',
      work_kind_code,
    } = queryDto;

    const query = this.workTypeRepository.createQueryBuilder('work_type');

    if (work_title) {
      query.andWhere('work_type.work_title LIKE :work_title', {
        work_title: `%${work_title}%`,
      });
    }

    if (
      work_kind_code !== undefined &&
      work_kind_code !== null &&
      work_kind_code !== ''
    ) {
      query.andWhere(
        'JSON_UNQUOTE(JSON_EXTRACT(work_type.work_kind, "$.work_kind_code")) = :workKindCode',
        {
          workKindCode: work_kind_code,
        },
      );
    }

    query
      .orderBy('work_type.sort', 'DESC')
      .addOrderBy('work_type.createdAt', 'DESC');

    const total = await query.getCount();
    const data = await query
      .skip((pageIndex - 1) * pageSize)
      .take(pageSize)
      .getMany();

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
  }

  /**
   * 校验编码唯一性，存在重复时抛出友好错误
   * @param code 编码
   * @param excludeId 更新时需要排除的当前记录ID
   */
  private async ensureCodeUnique(
    code?: string | null,
    excludeId?: number,
  ): Promise<void> {
    const normalizedCode = normalizeCodeValue(code);
    if (!normalizedCode) {
      return;
    }

    const qb = this.workTypeRepository
      .createQueryBuilder('work_type')
      .where('work_type.code = :code', { code: normalizedCode });

    if (excludeId !== undefined) {
      qb.andWhere('work_type.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new BadRequestException(`编码 ${normalizedCode} 已存在，请勿重复`);
    }
  }

  /**
   * 创建工种类型
   * @param createWorkTypeDto 创建工种类型DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createWorkType(createWorkTypeDto: CreateWorkTypeDto): Promise<null> {
    try {
      const code = normalizeCodeValue(createWorkTypeDto.code);
      await this.ensureCodeUnique(code);

      // 创建新的工种类型记录
      const workType = this.workTypeRepository.create({
        ...createWorkTypeDto,
        code,
        sort: normalizeSortValue(createWorkTypeDto.sort),
      });

      // 保存到数据库
      await this.workTypeRepository.save(workType);

      await this.redisService.deleteByPattern(WORK_TYPE_PAGE_CACHE_PATTERN);
      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
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

      if (updateDto.code !== undefined) {
        await this.ensureCodeUnique(updateDto.code, id);
      }

      const updatePayload = { ...updateDto };
      if (updatePayload.code !== undefined) {
        updatePayload.code = normalizeCodeValue(updatePayload.code);
      }
      if (updatePayload.sort !== undefined && updatePayload.sort !== null) {
        updatePayload.sort = normalizeSortValue(updatePayload.sort);
      } else {
        delete updatePayload.sort;
      }

      Object.assign(workType, updatePayload);
      await this.workTypeRepository.save(workType);

      await this.redisService.deleteByPattern(WORK_TYPE_PAGE_CACHE_PATTERN);
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

      await this.redisService.deleteByPattern(WORK_TYPE_PAGE_CACHE_PATTERN);
      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除工种类型失败: ' + error.message);
    }
  }

  /**
   * 根据工种编码查询所有工价数据
   * @param workKindCode 工种编码
   * @returns 工价数据列表
   */
  async getWorkTypesByWorkKindId(workKindCode: string): Promise<WorkType[]> {
    try {
      const workTypes = await this.workTypeRepository
        .createQueryBuilder('work_type')
        .where(
          'JSON_UNQUOTE(JSON_EXTRACT(work_type.work_kind, "$.work_kind_code")) = :workKindCode',
          { workKindCode },
        )
        .orderBy('work_type.sort', 'DESC')
        .addOrderBy('work_type.createdAt', 'DESC')
        .getMany();

      return workTypes;
    } catch (error) {
      throw new BadRequestException(
        '根据工种编码查询工价数据失败: ' + error.message,
      );
    }
  }
}
