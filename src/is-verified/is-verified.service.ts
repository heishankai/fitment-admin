import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { IsVerified } from './is-verified.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { CreateIsVerifiedDto } from './dto/create-is-verified.dto';
import { UpdateIsVerifiedDto } from './dto/update-is-verified.dto';
import { QueryIsVerifiedDto } from './dto/query-is-verified.dto';
import { SystemNotificationService } from '../system-notification/system-notification.service';

@Injectable()
export class IsVerifiedService {
  constructor(
    @InjectRepository(IsVerified)
    private readonly isVerifiedRepository: Repository<IsVerified>,
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    private readonly notificationService: SystemNotificationService,
  ) {}

  /**
   * 分页查询实名认证记录
   * @param queryDto 查询参数 {pageIndex, pageSize, card_name, nickname, phone}
   * @returns 分页结果
   */
  async getIsVerifiedByPage(queryDto: QueryIsVerifiedDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        card_name = '',
        nickname,
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
      const query = this.isVerifiedRepository.createQueryBuilder('is_verified');

      // 添加筛选条件（只有当 card_name 有实际内容时才添加）
      if (card_name && card_name.trim()) {
        query.andWhere('is_verified.card_name LIKE :card_name', {
          card_name: `%${card_name.trim()}%`,
        });
      }

      // 如果提供了昵称或手机号，添加用户ID筛选条件
      if (filteredUserIds && filteredUserIds.length > 0) {
        query.andWhere('is_verified.userId IN (:...userIds)', {
          userIds: filteredUserIds,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('is_verified.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 获取所有唯一的 userId
      const userIds = [...new Set(data.map((item) => item.userId))];

      // 批量查询用户的认证状态、昵称和手机号
      const users = await this.craftsmanUserRepository.find({
        where: userIds.map((id) => ({ id })),
        select: ['id', 'isVerified', 'nickname', 'phone'],
      });

      // 创建 userId -> userInfo 的映射
      const userInfoMap = new Map(
        users.map((user) => [
          user.id,
          {
            isVerified: user.isVerified === true,
            nickname: user.nickname || '',
            phone: user.phone || '',
          },
        ]),
      );

      // 为每条记录添加用户信息
      const dataWithVerified = data.map((item) => {
        const userInfo = userInfoMap.get(item.userId) || {
          isVerified: false,
          nickname: '',
          phone: '',
        };
        return {
          ...item,
          isVerified: userInfo.isVerified,
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
   * 创建实名认证记录（支持重新提交，已通过认证的用户再次提交会将状态设为 false）
   * @param userId 用户ID（从token中解析）
   * @param createIsVerifiedDto 创建实名认证DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createIsVerified(
    userId: number,
    createIsVerifiedDto: CreateIsVerifiedDto,
  ): Promise<null> {
    try {
      // 检查该用户是否已有实名认证记录
      const existing = await this.isVerifiedRepository.findOne({
        where: { userId },
      });

      // 检查用户的认证状态
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
        select: ['id', 'isVerified'],
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      // 如果已有记录，允许更新现有记录（重新提交）
      if (existing) {
        // 如果用户已通过认证，再次提交时将认证状态设置为 false（需要重新审核）
        if (user.isVerified === true) {
          await this.craftsmanUserRepository.update(userId, {
            isVerified: false,
          });
        }

        // 只更新 IsVerified 实体中存在的字段
        const updateData: Partial<IsVerified> = {};
        if (createIsVerifiedDto.card_front_image !== undefined) {
          updateData.card_front_image = createIsVerifiedDto.card_front_image;
        }
        if (createIsVerifiedDto.card_reverse_image !== undefined) {
          updateData.card_reverse_image = createIsVerifiedDto.card_reverse_image;
        }
        if (createIsVerifiedDto.card_name !== undefined) {
          updateData.card_name = createIsVerifiedDto.card_name;
        }
        if (createIsVerifiedDto.card_number !== undefined) {
          updateData.card_number = createIsVerifiedDto.card_number;
        }
        if (createIsVerifiedDto.card_address !== undefined) {
          updateData.card_address = createIsVerifiedDto.card_address;
        }
        if (createIsVerifiedDto.card_start_date !== undefined) {
          updateData.card_start_date = createIsVerifiedDto.card_start_date;
        }
        if (createIsVerifiedDto.card_end_date !== undefined) {
          updateData.card_end_date = createIsVerifiedDto.card_end_date;
        }
        await this.isVerifiedRepository.update(existing.id, updateData);
        return null;
      }

      // 如果没有记录，创建新的实名认证记录
      const isVerified = this.isVerifiedRepository.create({
        ...createIsVerifiedDto,
        userId,
      });

      // 保存到数据库
      await this.isVerifiedRepository.save(isVerified);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('创建实名认证记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取实名认证记录
   * @param id 实名认证ID
   * @returns 实名认证记录
   */
  async findOne(id: number): Promise<IsVerified> {
    const isVerified = await this.isVerifiedRepository.findOne({
      where: { id },
    });

    if (!isVerified) {
      throw new BadRequestException('实名认证记录不存在');
    }

    return isVerified;
  }

  /**
   * 根据用户ID获取实名认证记录
   * @param userId 用户ID
   * @returns 实名认证记录
   */
  async findByUserId(userId: number): Promise<IsVerified | null> {
    const isVerified = await this.isVerifiedRepository.findOne({
      where: { userId },
    });

    return isVerified;
  }

  /**
   * 根据用户ID获取实名认证记录（包含用户的 isVerified 状态）
   * @param userId 用户ID
   * @returns 实名认证记录（包含用户的 isVerified 状态）
   */
  async findByUserIdWithVerified(
    userId: number,
  ): Promise<(IsVerified & { isVerified: boolean }) | null> {
    // 查询实名认证记录
    const isVerified = await this.isVerifiedRepository.findOne({
      where: { userId },
    });

    // 查询用户的认证状态
    const user = await this.craftsmanUserRepository.findOne({
      where: { id: userId },
      select: ['id', 'isVerified'],
    });

    if (!isVerified) {
      return null;
    }

    // 返回包含用户认证状态的数据
    // isVerified 动态返回：只有当用户真正通过认证时才为 true
    return {
      ...isVerified,
      isVerified: user?.isVerified === true,
    };
  }

  /**
   * 根据ID更新实名认证记录
   * @param id 实名认证ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateIsVerified(
    id: number,
    updateDto: UpdateIsVerifiedDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const isVerified = await this.isVerifiedRepository.findOne({
        where: { id },
      });

      if (!isVerified) {
        throw new BadRequestException('实名认证记录不存在');
      }

      // 更新记录
      await this.isVerifiedRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新实名认证记录失败: ' + error.message);
    }
  }

  /**
   * 根据用户ID更新实名认证记录
   * @param userId 用户ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateByUserId(
    userId: number,
    updateDto: UpdateIsVerifiedDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const isVerified = await this.isVerifiedRepository.findOne({
        where: { userId },
      });

      if (!isVerified) {
        throw new BadRequestException('实名认证记录不存在');
      }

      // 更新记录
      await this.isVerifiedRepository.update(isVerified.id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新实名认证记录失败: ' + error.message);
    }
  }

  /**
   * 认证通过，更新用户的 isVerified 状态为 true
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

      // 更新用户的 isVerified 状态为 true
      await this.craftsmanUserRepository.update(userId, {
        isVerified: true,
      });

      // 创建系统通知
      await this.notificationService.create({
        userId,
        notification_type: 'is-verified',
        title: '实名认证审核通过',
        content: '恭喜您，您的实名认证已通过审核！',
        is_read: false,
      });

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('认证通过操作失败: ' + error.message);
    }
  }

  /**
   * 认证不通过，更新用户的 isVerified 状态为 false
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

      // 更新用户的 isVerified 状态为 false
      await this.craftsmanUserRepository.update(userId, {
        isVerified: false,
      });

      // 创建系统通知
      const notificationContent = reason
        ? `很抱歉，您的实名认证未通过审核。原因：${reason}`
        : '很抱歉，您的实名认证未通过审核，请重新提交认证材料。';

      await this.notificationService.create({
        userId,
        notification_type: 'is-verified',
        title: '实名认证审核不通过',
        content: notificationContent,
        is_read: false,
      });

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('认证不通过操作失败: ' + error.message);
    }
  }
}

