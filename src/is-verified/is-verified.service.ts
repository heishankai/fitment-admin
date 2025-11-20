import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsVerified } from './is-verified.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { CreateIsVerifiedDto } from './dto/create-is-verified.dto';
import { UpdateIsVerifiedDto } from './dto/update-is-verified.dto';
import { QueryIsVerifiedDto } from './dto/query-is-verified.dto';

@Injectable()
export class IsVerifiedService {
  constructor(
    @InjectRepository(IsVerified)
    private readonly isVerifiedRepository: Repository<IsVerified>,
    @InjectRepository(CraftsmanUser)
    private readonly craftsmanUserRepository: Repository<CraftsmanUser>,
  ) {}

  /**
   * 分页查询实名认证记录
   * @param queryDto 查询参数 {pageIndex, pageSize, card_name}
   * @returns 分页结果
   */
  async getIsVerifiedByPage(queryDto: QueryIsVerifiedDto): Promise<any> {
    try {
      // 获取参数
      const {
        pageIndex = 1,
        pageSize = 10,
        card_name = '',
      } = queryDto;

      // 创建查询构建器
      const query = this.isVerifiedRepository.createQueryBuilder('is_verified');

      // 添加筛选条件
      if (card_name) {
        query.andWhere('is_verified.card_name LIKE :card_name', {
          card_name: `%${card_name}%`,
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

      // 批量查询用户的认证状态
      const users = await this.craftsmanUserRepository.find({
        where: userIds.map((id) => ({ id })),
        select: ['id', 'isVerified'],
      });

      // 创建 userId -> isVerified 的映射
      const userVerifiedMap = new Map(
        users.map((user) => [user.id, user.isVerified || false]),
      );

      // 为每条记录添加 isVerified 字段
      const dataWithVerified = data.map((item) => ({
        ...item,
        isVerified: userVerifiedMap.get(item.userId) || false,
      }));

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
   * 创建实名认证记录
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

      if (existing) {
        throw new BadRequestException('已存在实名认证记录，审核中.......');
      }

      // 创建新的实名认证记录，包含userId
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
    return {
      ...isVerified,
      isVerified: user?.isVerified || false,
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

      // 返回null，全局拦截器会自动包装成 { success: true, data: null, code: 200, message: null }
      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('认证通过操作失败: ' + error.message);
    }
  }
}

