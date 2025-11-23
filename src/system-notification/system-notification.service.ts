import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemNotification } from './system-notification.entity';
import { CreateSystemNotificationDto } from './dto/create-system-notification.dto';

@Injectable()
export class SystemNotificationService {
  constructor(
    @InjectRepository(SystemNotification)
    private readonly notificationRepository: Repository<SystemNotification>,
  ) {}

  /**
   * 创建系统通知
   * @param createDto 创建通知的DTO
   * @returns 创建的通知
   */
  async create(
    createDto: CreateSystemNotificationDto,
  ): Promise<SystemNotification> {
    try {
      const notification = this.notificationRepository.create({
        ...createDto,
        is_read: createDto.is_read || false,
      });
      return await this.notificationRepository.save(notification);
    } catch (error) {
      throw new BadRequestException('创建系统通知失败: ' + error.message);
    }
  }

  /**
   * 获取用户的通知列表
   * @param userId 用户ID
   * @param isRead 是否已读（可选，用于筛选）
   * @returns 通知列表
   */
  async getUserNotifications(
    userId: number,
    isRead?: boolean,
  ): Promise<SystemNotification[]> {
    try {
      const where: any = { userId };
      if (isRead !== undefined) {
        where.is_read = isRead;
      }

      const notifications = await this.notificationRepository.find({
        where,
        relations: ['user'],
        order: {
          createdAt: 'DESC',
        },
      });

      return notifications;
    } catch (error) {
      throw new BadRequestException('获取通知列表失败: ' + error.message);
    }
  }

  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @returns null
   */
  async markAsRead(notificationId: number): Promise<null> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new BadRequestException('通知不存在');
      }

      await this.notificationRepository.update(notificationId, {
        is_read: true,
      });

      return null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('标记已读失败: ' + error.message);
    }
  }

  /**
   * 标记用户的所有通知为已读
   * @param userId 用户ID
   * @returns null
   */
  async markAllAsRead(userId: number): Promise<null> {
    try {
      await this.notificationRepository.update(
        { userId, is_read: false },
        { is_read: true },
      );

      return null;
    } catch (error) {
      throw new BadRequestException('标记全部已读失败: ' + error.message);
    }
  }

  /**
   * 获取用户未读通知数量
   * @param userId 用户ID
   * @returns 未读通知数量
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.notificationRepository.count({
        where: { userId, is_read: false },
      });
    } catch (error) {
      throw new BadRequestException('获取未读数量失败: ' + error.message);
    }
  }
}

