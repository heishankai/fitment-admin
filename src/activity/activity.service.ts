import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Activity } from './activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  /**
   * 查询所有活动列表
   * @returns 活动列表
   */
  async findAll(): Promise<Activity[]> {
    try {
      return await this.activityRepository.find({
        order: {
          sortOrder: 'ASC',
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      throw new BadRequestException('查询活动列表失败: ' + error.message);
    }
  }

  /**
   * 根据ID查询活动详情
   * @param id 活动ID
   * @returns 活动详情
   */
  async findOne(id: number): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id },
      });

      if (!activity) {
        throw new BadRequestException('活动记录不存在');
      }

      return activity;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('查询活动详情失败: ' + error.message);
    }
  }

  /**
   * 创建活动
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreateActivityDto): Promise<null> {
    try {
      const activity = this.activityRepository.create(createDto);
      await this.activityRepository.save(activity);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建活动失败: ' + error.message);
    }
  }

  /**
   * 根据ID更新活动
   * @param id 活动ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdateActivityDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const existingActivity = await this.activityRepository.findOne({
        where: { id },
      });

      if (!existingActivity) {
        throw new BadRequestException('活动记录不存在');
      }

      // 更新记录
      await this.activityRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新活动失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除活动
   * @param id 活动ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const activity = await this.activityRepository.findOne({
        where: { id },
      });

      if (!activity) {
        throw new BadRequestException('活动记录不存在');
      }

      // 删除记录
      await this.activityRepository.remove(activity);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除活动失败: ' + error.message);
    }
  }

  /**
   * 更新活动排序
   * @param ids 排序后的活动ID数组，数组顺序即为排序顺序
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateSort(ids: number[]): Promise<null> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException('排序ID数组不能为空');
      }

      // 验证所有ID是否存在
      const activities = await this.activityRepository.find({
        where: {
          id: In(ids),
        },
      });

      if (activities.length !== ids.length) {
        const foundIds = activities.map((a) => a.id);
        const notFoundIds = ids.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `部分活动ID不存在: ${notFoundIds.join(', ')}`,
        );
      }

      // 批量更新排序字段，数组索引即为排序值
      const updatePromises = ids.map((id, index) => {
        return this.activityRepository.update(id, { sortOrder: index });
      });

      await Promise.all(updatePromises);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新活动排序失败: ' + error.message);
    }
  }
}
