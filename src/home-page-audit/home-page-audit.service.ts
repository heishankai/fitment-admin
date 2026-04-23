import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  HomePageAudit,
  HOME_PAGE_AUDIT_STATUS,
  HOME_PAGE_AUDIT_STATUS_MAP,
} from './home-page-audit.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { CreateHomePageAuditDto } from './dto/create-home-page-audit.dto';
import { UpdateHomePageAuditDto } from './dto/update-home-page-audit.dto';
import { QueryHomePageAuditDto } from './dto/query-home-page-audit.dto';
import { QueryMyWorksDto } from './dto/query-my-works.dto';
import { SystemNotificationService } from '../system-notification/system-notification.service';

@Injectable()
export class HomePageAuditService {
  constructor(
    @InjectRepository(HomePageAudit)
    private readonly homePageAuditRepository: Repository<HomePageAudit>,
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    private readonly notificationService: SystemNotificationService,
  ) {}

  /**
   * 分页查询首页审核记录
   * @param queryDto 查询参数 {pageIndex, pageSize, nickname, phone, status}
   * @returns 分页结果
   */
  async getHomePageAuditByPage(queryDto: QueryHomePageAuditDto): Promise<any> {
    try {
      const {
        pageIndex = 1,
        pageSize = 10,
        nickname = '',
        phone,
        status,
      } = queryDto;

      let filteredUserIds: number[] | null = null;
      const hasNickname = nickname && nickname.trim();
      const hasPhone = phone && phone.trim();
      if (hasNickname || hasPhone) {
        const whereConditions: any = {};
        if (hasNickname) {
          whereConditions.nickname = Like(`%${nickname.trim()}%`);
        }
        if (hasPhone) {
          whereConditions.phone = phone.trim();
        }

        const matchedUsers = await this.craftsmanUserRepository.find({
          where: whereConditions,
          select: ['id'],
        });
        filteredUserIds = matchedUsers.map((user) => user.id);

        if (filteredUserIds.length === 0) {
          return {
            success: true,
            data: [],
            code: 200,
            message: null,
            pageIndex,
            pageSize,
            total: 0,
            pageTotal: 0,
          };
        }
      }

      const query =
        this.homePageAuditRepository.createQueryBuilder('home_page_audit');

      if (filteredUserIds && filteredUserIds.length > 0) {
        query.andWhere('home_page_audit.userId IN (:...userIds)', {
          userIds: filteredUserIds,
        });
      }

      if (status !== undefined && status !== null) {
        query.andWhere('home_page_audit.status = :status', { status });
      }

      query.orderBy('home_page_audit.createdAt', 'DESC');

      const total = await query.getCount();

      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      const userIds = [...new Set(data.map((item) => item.userId))];

      const users = await this.craftsmanUserRepository.find({
        where: userIds.map((id) => ({ id })),
        select: ['id', 'nickname', 'phone'],
      });

      const userInfoMap = new Map(
        users.map((user) => [
          user.id,
          {
            nickname: user.nickname || '',
            phone: user.phone || '',
          },
        ]),
      );

      const dataWithUser = data.map((item) => {
        const userInfo = userInfoMap.get(item.userId) || {
          nickname: '',
          phone: '',
        };
        return {
          ...item,
          status_name: HOME_PAGE_AUDIT_STATUS_MAP[item.status] || item.status_name,
          nickname: userInfo.nickname,
          phone: userInfo.phone,
        };
      });

      return {
        success: true,
        data: dataWithUser,
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
   * 分页查询当前用户的所有作品
   * @param userId 用户ID（从token解析）
   * @param queryDto 分页参数 {pageIndex, pageSize, status}
   * @returns 分页结果
   */
  async getMyWorksByPage(
    userId: number,
    queryDto: QueryMyWorksDto,
  ): Promise<any> {
    try {
      const { pageIndex = 1, pageSize = 10, status } = queryDto;

      const query =
        this.homePageAuditRepository.createQueryBuilder('home_page_audit')
          .where('home_page_audit.userId = :userId', { userId });

      if (status !== undefined && status !== null) {
        query.andWhere('home_page_audit.status = :status', { status });
      }

      query.orderBy('home_page_audit.createdAt', 'DESC');

      const total = await query.getCount();

      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      const dataWithStatusName = data.map((item) => ({
        ...item,
        status_name: HOME_PAGE_AUDIT_STATUS_MAP[item.status] || item.status_name,
      }));

      return {
        success: true,
        data: dataWithStatusName,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('分页查询当前用户作品错误:', error);
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
   * 创建首页审核记录（支持每个工匠新增多条）
   * @param userId 用户ID（从token中解析）
   * @param createHomePageAuditDto 创建首页审核DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createHomePageAudit(
    userId: number,
    createHomePageAuditDto: CreateHomePageAuditDto,
  ): Promise<null> {
    try {
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      const homePageAudit = this.homePageAuditRepository.create({
        userId,
        publish_text: createHomePageAuditDto.publish_text,
        publish_images: createHomePageAuditDto.publish_images,
        status: HOME_PAGE_AUDIT_STATUS.PENDING,
        status_name: HOME_PAGE_AUDIT_STATUS_MAP[HOME_PAGE_AUDIT_STATUS.PENDING],
      });

      await this.homePageAuditRepository.save(homePageAudit);
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('创建首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID删除首页审核记录
   * @param id 首页审核记录ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async deleteHomePageAudit(id: number): Promise<null> {
    try {
      const record = await this.homePageAuditRepository.findOne({
        where: { id },
      });

      if (!record) {
        throw new BadRequestException('首页审核记录不存在');
      }

      await this.homePageAuditRepository.remove(record);
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取首页审核记录
   */
  async findOne(id: number): Promise<HomePageAudit> {
    const homePageAudit = await this.homePageAuditRepository.findOne({
      where: { id },
    });

    if (!homePageAudit) {
      throw new BadRequestException('首页审核记录不存在');
    }

    return homePageAudit;
  }

  /**
   * 根据用户ID获取该工匠的所有首页审核记录（按创建时间倒序）
   */
  async findByUserId(userId: number): Promise<HomePageAudit[]> {
    return this.homePageAuditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 根据工匠用户ID获取全部审核通过（已发布）的作品
   */
  async findPublishedWorksByUserId(userId: number): Promise<HomePageAudit[]> {
    const records = await this.homePageAuditRepository.find({
      where: {
        userId,
        status: HOME_PAGE_AUDIT_STATUS.PUBLISHED,
      },
      order: { createdAt: 'DESC' },
    });

    return records.map((item) => ({
      ...item,
      status_name: HOME_PAGE_AUDIT_STATUS_MAP[item.status] || item.status_name,
    }));
  }

  /**
   * 根据token获取当前用户的所有首页审核记录（按创建时间倒序）
   */
  async findByUserIdWithToken(userId: number): Promise<HomePageAudit[]> {
    const records = await this.homePageAuditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return records.map((item) => ({
      ...item,
      status_name: HOME_PAGE_AUDIT_STATUS_MAP[item.status] || item.status_name,
    }));
  }

  /**
   * 根据ID更新首页审核记录
   */
  async updateHomePageAudit(
    id: number,
    updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    try {
      const homePageAudit = await this.homePageAuditRepository.findOne({
        where: { id },
      });

      if (!homePageAudit) {
        throw new BadRequestException('首页审核记录不存在');
      }

      const updateData: Partial<HomePageAudit> = { ...updateDto };
      if (updateDto.status !== undefined) {
        updateData.status_name = HOME_PAGE_AUDIT_STATUS_MAP[updateDto.status] ?? updateDto.status_name;
      }

      await this.homePageAuditRepository.update(id, updateData);
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 根据用户ID更新首页审核记录（更新该用户最新的一条）
   */
  async updateByUserId(
    userId: number,
    updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    try {
      const homePageAudit = await this.homePageAuditRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (!homePageAudit) {
        throw new BadRequestException('该用户暂无首页审核记录');
      }

      const updateData: Partial<HomePageAudit> = { ...updateDto };
      if (updateDto.status !== undefined) {
        updateData.status_name = HOME_PAGE_AUDIT_STATUS_MAP[updateDto.status] ?? updateDto.status_name;
      }

      await this.homePageAuditRepository.update(homePageAudit.id, updateData);
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 审核通过，更新记录的 status 为 1（已发布）
   * @param id 首页审核记录ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async approveVerificationById(id: number): Promise<null> {
    try {
      const record = await this.homePageAuditRepository.findOne({
        where: { id },
      });

      if (!record) {
        throw new BadRequestException('首页审核记录不存在');
      }

      await this.homePageAuditRepository.update(id, {
        status: HOME_PAGE_AUDIT_STATUS.PUBLISHED,
        status_name: HOME_PAGE_AUDIT_STATUS_MAP[HOME_PAGE_AUDIT_STATUS.PUBLISHED],
      });

      await this.notificationService.create({
        userId: record.userId,
        notification_type: 'home-page-audit',
        title: '个人主页审核通过',
        content: '恭喜您，您的个人主页信息已通过审核！',
        is_read: false,
      });

      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('审核通过操作失败: ' + error.message);
    }
  }

  /**
   * 按用户ID审核通过（审核该用户最新的一条待审核记录）
   * @param userId 工匠用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async approveVerificationByUserId(userId: number): Promise<null> {
    const record = await this.homePageAuditRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException('该用户暂无首页审核记录');
    }

    return this.approveVerificationById(record.id);
  }

  /**
   * 按用户ID审核不通过（拒绝该用户最新的一条待审核记录）
   */
  async rejectVerificationByUserId(userId: number, reason?: string): Promise<null> {
    const record = await this.homePageAuditRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException('该用户暂无首页审核记录');
    }

    return this.rejectVerification(record.id, reason);
  }

  /**
   * 审核不通过，更新记录的 status 为 3（审核失败）
   * @param id 首页审核记录ID
   * @param reason 拒绝原因（可选）
   * @returns null，由全局拦截器包装成标准响应
   */
  async rejectVerification(id: number, reason?: string): Promise<null> {
    try {
      const record = await this.homePageAuditRepository.findOne({
        where: { id },
      });

      if (!record) {
        throw new BadRequestException('首页审核记录不存在');
      }

      await this.homePageAuditRepository.update(id, {
        status: HOME_PAGE_AUDIT_STATUS.REJECTED,
        status_name: HOME_PAGE_AUDIT_STATUS_MAP[HOME_PAGE_AUDIT_STATUS.REJECTED],
      });

      const notificationContent = reason
        ? `很抱歉，您的个人主页信息未通过审核。原因：${reason}`
        : '很抱歉，您的个人主页信息未通过审核，请重新提交审核材料。';

      await this.notificationService.create({
        userId: record.userId,
        notification_type: 'home-page-audit',
        title: '个人主页审核不通过',
        content: notificationContent,
        is_read: false,
      });

      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('审核不通过操作失败: ' + error.message);
    }
  }
}
