import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { HomePageAudit } from './home-page-audit.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { CreateHomePageAuditDto } from './dto/create-home-page-audit.dto';
import { UpdateHomePageAuditDto } from './dto/update-home-page-audit.dto';
import { QueryHomePageAuditDto } from './dto/query-home-page-audit.dto';
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
   * @param queryDto 查询参数 {pageIndex, pageSize, nickname, phone}
   * @returns 分页结果
   */
  async getHomePageAuditByPage(
    queryDto: QueryHomePageAuditDto,
  ): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        nickname = '',
        phone,
      } = queryDto;

      // 如果提供了昵称或手机号，需要先查询符合条件的用户ID
      let filteredUserIds: number[] | null = null;
      const hasNickname = nickname && nickname.trim();
      const hasPhone = phone && phone.trim();
      if (hasNickname || hasPhone) {
        // 构建查询条件
        const whereConditions: any = {};
        if (hasNickname) {
          whereConditions.nickname = Like(`%${nickname.trim()}%`);
        }
        if (hasPhone) {
          // 手机号使用精确匹配
          whereConditions.phone = phone.trim();
        }

        const matchedUsers = await this.craftsmanUserRepository.find({
          where: whereConditions,
          select: ['id'],
        });
        filteredUserIds = matchedUsers.map((user) => user.id);

        // 如果没有匹配的用户，直接返回空结果
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

      // 创建查询构建器
      const query =
        this.homePageAuditRepository.createQueryBuilder('home_page_audit');

      // 如果提供了昵称或手机号，添加用户ID筛选条件
      if (filteredUserIds && filteredUserIds.length > 0) {
        query.andWhere('home_page_audit.userId IN (:...userIds)', {
          userIds: filteredUserIds,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('home_page_audit.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 获取所有唯一的 userId
      const userIds = [...new Set(data.map((item) => item.userId))];

      // 批量查询用户信息（包括昵称、手机号和审核状态）
      const users = await this.craftsmanUserRepository.find({
        where: userIds.map((id) => ({ id })),
        select: ['id', 'nickname', 'phone', 'isHomePageVerified'],
      });

      // 创建 userId -> userInfo 的映射
      const userInfoMap = new Map(
        users.map((user) => [
          user.id,
          {
            isHomePageVerified: user.isHomePageVerified === true,
            nickname: user.nickname || '',
            phone: user.phone || '',
          },
        ]),
      );

      // 为每条记录添加用户信息
      const dataWithVerified = data.map((item) => {
        const userInfo = userInfoMap.get(item.userId) || {
          isHomePageVerified: false,
          nickname: '',
          phone: '',
        };
        return {
          ...item,
          isHomePageVerified: userInfo.isHomePageVerified,
          nickname: userInfo.nickname,
          phone: userInfo.phone,
        };
      });

      // 返回结果（包含分页信息的完整格式）
      return {
        success: true,
        data: dataWithVerified,
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
   * 创建首页审核记录（支持重新提交，已通过认证的用户再次提交会将状态设为 false）
   * @param userId 用户ID（从token中解析）
   * @param createHomePageAuditDto 创建首页审核DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createHomePageAudit(
    userId: number,
    createHomePageAuditDto: CreateHomePageAuditDto,
  ): Promise<null> {
    try {
      // 检查该用户是否已有首页审核记录
      const existing = await this.homePageAuditRepository.findOne({
        where: { userId },
      });

      // 检查用户的认证状态
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
        select: ['id', 'isHomePageVerified'],
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      // 如果已有记录，允许更新现有记录（重新提交）
      if (existing) {
        // 如果用户已通过认证，再次提交时将认证状态设置为 false（需要重新审核）
        if (user.isHomePageVerified === true) {
          await this.craftsmanUserRepository.update(userId, {
            isHomePageVerified: false,
          });
        }

        // 只更新 HomePageAudit 实体中存在的字段
        const updateData: Partial<HomePageAudit> = {};
        if (createHomePageAuditDto.intro !== undefined) {
          updateData.intro = createHomePageAuditDto.intro;
        }
        if (createHomePageAuditDto.awards !== undefined) {
          updateData.awards = createHomePageAuditDto.awards;
        }
        if (createHomePageAuditDto.awards_image !== undefined) {
          updateData.awards_image = createHomePageAuditDto.awards_image;
        }
        await this.homePageAuditRepository.update(existing.id, updateData);
        return null;
      }

      // 如果没有记录，创建新的首页审核记录
      const homePageAudit = this.homePageAuditRepository.create({
        ...createHomePageAuditDto,
        userId,
      });

      // 保存到数据库
      await this.homePageAuditRepository.save(homePageAudit);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('创建首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取首页审核记录
   * @param id 首页审核ID
   * @returns 首页审核记录
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
   * 根据用户ID获取首页审核记录
   * @param userId 用户ID
   * @returns 首页审核记录
   */
  async findByUserId(userId: number): Promise<HomePageAudit | null> {
    const homePageAudit = await this.homePageAuditRepository.findOne({
      where: { userId },
    });

    return homePageAudit;
  }

  /**
   * 根据token获取当前用户的首页审核记录（包含用户的 isHomePageVerified 状态）
   * @param userId 用户ID
   * @returns 首页审核记录（包含用户的 isHomePageVerified 状态）
   */
  async findByUserIdWithToken(
    userId: number,
  ): Promise<(HomePageAudit & { isHomePageVerified: boolean }) | null> {
    // 查询首页审核记录
    const homePageAudit = await this.homePageAuditRepository.findOne({
      where: { userId },
    });

    // 查询用户的首页审核状态
    const user = await this.craftsmanUserRepository.findOne({
      where: { id: userId },
      select: ['id', 'isHomePageVerified'],
    });

    if (!homePageAudit) {
      return null;
    }

    // 返回包含用户首页审核状态的数据
    // isHomePageVerified 动态返回：只有当用户真正通过认证时才为 true
    return {
      ...homePageAudit,
      isHomePageVerified: user?.isHomePageVerified === true,
    };
  }

  /**
   * 根据ID更新首页审核记录
   * @param id 首页审核ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateHomePageAudit(
    id: number,
    updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const homePageAudit = await this.homePageAuditRepository.findOne({
        where: { id },
      });

      if (!homePageAudit) {
        throw new BadRequestException('首页审核记录不存在');
      }

      // 更新记录
      await this.homePageAuditRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 根据用户ID更新首页审核记录
   * @param userId 用户ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateByUserId(
    userId: number,
    updateDto: UpdateHomePageAuditDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const homePageAudit = await this.homePageAuditRepository.findOne({
        where: { userId },
      });

      if (!homePageAudit) {
        throw new BadRequestException('首页审核记录不存在');
      }

      // 更新记录
      await this.homePageAuditRepository.update(homePageAudit.id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新首页审核记录失败: ' + error.message);
    }
  }

  /**
   * 审核通过，更新用户的 isHomePageVerified 状态为 true
   * @param userId 用户ID
   * @returns null，由全局拦截器包装成标准响应
   */
  async approveVerification(userId: number): Promise<null> {
    try {
      // 检查用户是否存在
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      // 更新用户的 isHomePageVerified 状态为 true
      await this.craftsmanUserRepository.update(userId, {
        isHomePageVerified: true,
      });

      // 创建系统通知
      await this.notificationService.create({
        userId,
        notification_type: 'home-page-audit',
        title: '个人主页审核通过',
        content: '恭喜您，您的个人主页信息已通过审核！',
        is_read: false,
      });

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('审核通过操作失败: ' + error.message);
    }
  }

  /**
   * 审核不通过，更新用户的 isHomePageVerified 状态为 false
   * @param userId 用户ID
   * @param reason 拒绝原因（可选）
   * @returns null，由全局拦截器包装成标准响应
   */
  async rejectVerification(
    userId: number,
    reason?: string,
  ): Promise<null> {
    try {
      // 检查用户是否存在
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      // 更新用户的 isHomePageVerified 状态为 false
      await this.craftsmanUserRepository.update(userId, {
        isHomePageVerified: false,
      });

      // 创建系统通知
      const notificationContent = reason
        ? `很抱歉，您的个人主页信息未通过审核。原因：${reason}`
        : '很抱歉，您的个人主页信息未通过审核，请重新提交审核材料。';

      await this.notificationService.create({
        userId,
        notification_type: 'home-page-audit',
        title: '个人主页审核不通过',
        content: notificationContent,
        is_read: false,
      });

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('审核不通过操作失败: ' + error.message);
    }
  }
}

