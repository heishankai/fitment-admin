import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { IsSkillVerified } from './is-skill-verified.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { CreateIsSkillVerifiedDto } from './dto/create-is-skill-verified.dto';
import { UpdateIsSkillVerifiedDto } from './dto/update-is-skill-verified.dto';
import { QueryIsSkillVerifiedDto } from './dto/query-is-skill-verified.dto';
import { SystemNotificationService } from '../system-notification/system-notification.service';

@Injectable()
export class IsSkillVerifiedService {
  constructor(
    @InjectRepository(IsSkillVerified)
    private readonly isSkillVerifiedRepository: Repository<IsSkillVerified>,
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
    private readonly notificationService: SystemNotificationService,
  ) {}

  /**
   * 分页查询技能认证记录
   * @param queryDto 查询参数 {pageIndex, pageSize, workKindId, nickname, phone}
   * @returns 分页结果
   */
  async getIsSkillVerifiedByPage(
    queryDto: QueryIsSkillVerifiedDto,
  ): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        workKindId,
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
      const query =
        this.isSkillVerifiedRepository.createQueryBuilder('is_skill_verified');

      // 添加筛选条件
      if (workKindId) {
        query.andWhere('is_skill_verified.workKindId = :workKindId', {
          workKindId,
        });
      }

      // 如果提供了昵称或手机号，添加用户ID筛选条件
      if (filteredUserIds && filteredUserIds.length > 0) {
        query.andWhere('is_skill_verified.userId IN (:...userIds)', {
          userIds: filteredUserIds,
        });
      }

      // 按创建时间倒序排列
      query.orderBy('is_skill_verified.createdAt', 'DESC');

      // 查询总数
      const total = await query.getCount();

      // 查询数据（分页）
      const data = await query
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // 获取所有唯一的 userId
      const userIds = [...new Set(data.map((item) => item.userId))];

      // 批量查询用户的技能认证状态、昵称和手机号
      const users = await this.craftsmanUserRepository.find({
        where: userIds.map((id) => ({ id })),
        select: ['id', 'isSkillVerified', 'nickname', 'phone'],
      });

      // 创建 userId -> userInfo 的映射
      const userInfoMap = new Map(
        users.map((user) => [
          user.id,
          {
            isSkillVerified: user.isSkillVerified || false,
            nickname: user.nickname || '',
            phone: user.phone || '',
          },
        ]),
      );

      // 为每条记录添加用户信息
      const dataWithVerified = data.map((item) => {
        const userInfo = userInfoMap.get(item.userId) || {
          isSkillVerified: false,
          nickname: '',
          phone: '',
        };
        return {
          ...item,
          isSkillVerified: userInfo.isSkillVerified,
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
   * 创建技能认证记录（支持重新提交，已通过认证的用户再次提交会将状态设为 false）
   * @param userId 用户ID（从token中解析）
   * @param createIsSkillVerifiedDto 创建技能认证DTO
   * @returns null，由全局拦截器包装成标准响应
   */
  async createIsSkillVerified(
    userId: number,
    createIsSkillVerifiedDto: CreateIsSkillVerifiedDto,
  ): Promise<null> {
    try {
      // 检查该用户是否已有技能认证记录
      const existing = await this.isSkillVerifiedRepository.findOne({
        where: { userId },
      });

      // 检查用户的认证状态
      const user = await this.craftsmanUserRepository.findOne({
        where: { id: userId },
        select: ['id', 'isSkillVerified'],
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      // 如果已有记录，允许更新现有记录（重新提交）
      if (existing) {
        // 如果用户已通过认证，再次提交时将认证状态设置为 false（需要重新审核）
        if (user.isSkillVerified === true) {
          await this.craftsmanUserRepository.update(userId, {
            isSkillVerified: false,
          });
        }

        // 只更新 IsSkillVerified 实体中存在的字段
        const updateData: Partial<IsSkillVerified> = {};
        if (createIsSkillVerifiedDto.promise_image !== undefined) {
          updateData.promise_image = createIsSkillVerifiedDto.promise_image;
        }
        if (createIsSkillVerifiedDto.operation_video !== undefined) {
          updateData.operation_video = createIsSkillVerifiedDto.operation_video;
        }
        if (createIsSkillVerifiedDto.workKindId !== undefined) {
          updateData.workKindId = createIsSkillVerifiedDto.workKindId;
        }
        if (createIsSkillVerifiedDto.workKindName !== undefined) {
          updateData.workKindName = createIsSkillVerifiedDto.workKindName;
        }
        await this.isSkillVerifiedRepository.update(existing.id, updateData);
        return null;
      }

      // 如果没有记录，创建新的技能认证记录
      const isSkillVerified = this.isSkillVerifiedRepository.create({
        ...createIsSkillVerifiedDto,
        userId,
      });

      // 保存到数据库
      await this.isSkillVerifiedRepository.save(isSkillVerified);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('创建技能认证记录失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取技能认证记录
   * @param id 技能认证ID
   * @returns 技能认证记录
   */
  async findOne(id: number): Promise<IsSkillVerified> {
    const isSkillVerified = await this.isSkillVerifiedRepository.findOne({
      where: { id },
    });

    if (!isSkillVerified) {
      throw new BadRequestException('技能认证记录不存在');
    }

    return isSkillVerified;
  }

  /**
   * 根据用户ID获取技能认证记录
   * @param userId 用户ID
   * @returns 技能认证记录
   */
  async findByUserId(userId: number): Promise<IsSkillVerified | null> {
    const isSkillVerified = await this.isSkillVerifiedRepository.findOne({
      where: { userId },
    });

    return isSkillVerified;
  }

  /**
   * 根据用户ID获取技能认证记录（包含用户的 isSkillVerified 状态）
   * @param userId 用户ID
   * @returns 技能认证记录（包含用户的 isSkillVerified 状态）
   */
  async findByUserIdWithVerified(
    userId: number,
  ): Promise<(IsSkillVerified & { isSkillVerified: boolean }) | null> {
    // 查询技能认证记录
    const isSkillVerified = await this.isSkillVerifiedRepository.findOne({
      where: { userId },
    });

    // 查询用户的技能认证状态
    const user = await this.craftsmanUserRepository.findOne({
      where: { id: userId },
      select: ['id', 'isSkillVerified'],
    });

    if (!isSkillVerified) {
      return null;
    }

    // 返回包含用户技能认证状态的数据
    return {
      ...isSkillVerified,
      isSkillVerified: user?.isSkillVerified || false,
    };
  }

  /**
   * 根据ID更新技能认证记录
   * @param id 技能认证ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateIsSkillVerified(
    id: number,
    updateDto: UpdateIsSkillVerifiedDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const isSkillVerified = await this.isSkillVerifiedRepository.findOne({
        where: { id },
      });

      if (!isSkillVerified) {
        throw new BadRequestException('技能认证记录不存在');
      }

      // 更新记录
      await this.isSkillVerifiedRepository.update(id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新技能认证记录失败: ' + error.message);
    }
  }

  /**
   * 根据用户ID更新技能认证记录
   * @param userId 用户ID
   * @param updateDto 更新数据
   * @returns null，由全局拦截器包装成标准响应
   */
  async updateByUserId(
    userId: number,
    updateDto: UpdateIsSkillVerifiedDto,
  ): Promise<null> {
    try {
      // 先检查记录是否存在
      const isSkillVerified = await this.isSkillVerifiedRepository.findOne({
        where: { userId },
      });

      if (!isSkillVerified) {
        throw new BadRequestException('技能认证记录不存在');
      }

      // 更新记录
      await this.isSkillVerifiedRepository.update(isSkillVerified.id, updateDto);

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('更新技能认证记录失败: ' + error.message);
    }
  }

  /**
   * 认证通过，更新用户的 isSkillVerified 状态为 true
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

      // 更新用户的 isSkillVerified 状态为 true
      await this.craftsmanUserRepository.update(userId, {
        isSkillVerified: true,
      });

      // 创建系统通知
      await this.notificationService.create({
        userId,
        notification_type: 'is-skill-verified',
        title: '技能认证审核通过',
        content: '恭喜您，您的技能认证已通过审核！',
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
   * 认证不通过，更新用户的 isSkillVerified 状态为 false
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

      // 更新用户的 isSkillVerified 状态为 false
      await this.craftsmanUserRepository.update(userId, {
        isSkillVerified: false,
      });

      // 创建系统通知
      const notificationContent = reason
        ? `很抱歉，您的技能认证未通过审核。原因：${reason}`
        : '很抱歉，您的技能认证未通过审核，请重新提交认证材料。';

      await this.notificationService.create({
        userId,
        notification_type: 'is-skill-verified',
        title: '技能认证审核不通过',
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

