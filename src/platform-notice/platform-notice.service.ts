import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformNotice } from './platform-notice.entity';
import { CreatePlatformNoticeDto } from './dto/create-platform-notice.dto';
import { QueryPlatformNoticeDto } from './dto/query-platform-notice.dto';
import { UpdatePlatformNoticeDto } from './dto/update-platform-notice.dto';

@Injectable()
export class PlatformNoticeService {
  constructor(
    @InjectRepository(PlatformNotice)
    private readonly platformNoticeRepository: Repository<PlatformNotice>,
  ) {}

  /**
   * 获取所有平台公告
   * @param notice_type 可选，公告类型：1-用户端公告，2-工匠端公告
   * @returns 所有平台公告列表
   */
  async getAllPlatformNotices(
    notice_type?: string | number,
  ): Promise<PlatformNotice[]> {
    try {
      const queryOptions: any = {
        order: {
          createdAt: 'DESC',
        },
      };

      // 如果提供了 notice_type，添加筛选条件
      if (
        notice_type !== undefined &&
        notice_type !== null &&
        notice_type !== ''
      ) {
        const typeValue = String(notice_type);
        // 验证类型值
        if (typeValue !== '1' && typeValue !== '2') {
          throw new BadRequestException(
            '公告类型必须是 1（用户端公告）或 2（工匠端公告）',
          );
        }
        queryOptions.where = {
          notice_type: typeValue,
        };
      }

      const notices = await this.platformNoticeRepository.find(queryOptions);
      return notices;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('获取平台公告失败: ' + error.message);
    }
  }

  /**
   * 分页查询平台公告
   * @param queryDto 查询参数 {pageIndex, pageSize, date, createTime, notice_title}
   * @returns 分页结果
   */
  async getPlatformNoticesByPage(
    queryDto: QueryPlatformNoticeDto,
  ): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        date = '',
        create_time = '',
        notice_title = '',
        notice_type,
      } = queryDto;

      // 创建查询构建器
      const query =
        this.platformNoticeRepository.createQueryBuilder('platform_notice');

      // 添加筛选条件
      if (notice_title) {
        query.andWhere('platform_notice.notice_title LIKE :notice_title', {
          notice_title: `%${notice_title}%`,
        });
      }

      // 公告类型筛选
      if (
        notice_type !== undefined &&
        notice_type !== null &&
        notice_type !== ''
      ) {
        // 统一转换为字符串进行比较
        const typeValue = String(notice_type);
        query.andWhere('platform_notice.notice_type = :notice_type', {
          notice_type: typeValue,
        });
      }

      // 日期筛选：YYYY-MM-DD 格式，查询当天的记录
      if (date) {
        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          throw new BadRequestException('日期格式错误，请使用 YYYY-MM-DD 格式');
        }

        // 构建日期范围：从当天的 00:00:00 到 23:59:59
        const startDate = new Date(date + ' 00:00:00');
        const endDate = new Date(date + ' 23:59:59');

        query.andWhere('platform_notice.createdAt >= :startDate', {
          startDate,
        });
        query.andWhere('platform_notice.createdAt <= :endDate', { endDate });
      }

      // createTime 排序（如果提供）
      if (create_time) {
        const order = create_time.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query.orderBy('platform_notice.createdAt', order);
      } else {
        // 默认按创建时间倒序排列
        query.orderBy('platform_notice.createdAt', 'DESC');
      }

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
      if (error instanceof BadRequestException) {
        throw error;
      }
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
   * 创建平台公告
   * @param createDto 创建数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async create(createDto: CreatePlatformNoticeDto): Promise<null> {
    try {
      // 创建新的平台公告记录
      const platformNotice = this.platformNoticeRepository.create(createDto);

      // 保存到数据库
      await this.platformNoticeRepository.save(platformNotice);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      throw new BadRequestException('创建平台公告失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取平台公告
   * @param id 平台公告ID
   * @returns 平台公告记录
   */
  async findOne(id: number): Promise<PlatformNotice> {
    const platformNotice = await this.platformNoticeRepository.findOne({
      where: { id },
    });

    if (!platformNotice) {
      throw new BadRequestException('平台公告记录不存在');
    }

    return platformNotice;
  }

  /**
   * 根据ID更新平台公告
   * @param id 平台公告ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async update(id: number, updateDto: UpdatePlatformNoticeDto): Promise<null> {
    try {
      // 先检查记录是否存在
      const platformNotice = await this.platformNoticeRepository.findOne({
        where: { id },
      });

      if (!platformNotice) {
        throw new BadRequestException('平台公告记录不存在');
      }

      // 更新记录
      await this.platformNoticeRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新平台公告失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除平台公告
   * @param id 平台公告ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async delete(id: number): Promise<null> {
    try {
      // 先检查记录是否存在
      const platformNotice = await this.platformNoticeRepository.findOne({
        where: { id },
      });

      if (!platformNotice) {
        throw new BadRequestException('平台公告记录不存在');
      }

      // 删除记录
      await this.platformNoticeRepository.remove(platformNotice);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除平台公告失败: ' + error.message);
    }
  }
}
