import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminNotification } from './admin-notification.entity';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { AdminNotificationGateway } from './admin-notification.gateway';

@Injectable()
export class AdminNotificationService {
  constructor(
    @InjectRepository(AdminNotification)
    private readonly notificationRepository: Repository<AdminNotification>,
    @Optional()
    private readonly notificationGateway?: AdminNotificationGateway,
  ) {}

  /**
   * 创建通知
   * @param createDto 创建通知的DTO
   * @returns 通知
   */
  async create(
    createDto: CreateAdminNotificationDto,
  ): Promise<AdminNotification> {
    try {
      const notification = this.notificationRepository.create({
        ...createDto,
        notification_time: createDto.notification_time
          ? new Date(createDto.notification_time)
          : new Date(),
        is_read: createDto.is_read ?? false,
      });
      const savedNotification = await this.notificationRepository.save(
        notification,
      );

      // 通过 WebSocket 推送新通知
      if (this.notificationGateway) {
        try {
          this.notificationGateway.notifyNewNotification(savedNotification);
          // 推送未读数量更新
          const unreadCount = await this.getUnreadCount(
            savedNotification.notification_type,
          );
          this.notificationGateway.notifyUnreadCountUpdate(
            unreadCount,
            savedNotification.notification_type,
          );
        } catch (error) {
          // WebSocket 推送失败不影响主流程
          console.error('WebSocket 推送失败:', error);
        }
      }

      return savedNotification;
    } catch (error) {
      throw new BadRequestException('创建通知失败: ' + error.message);
    }
  }

  /**
   * 获取所有通知列表（管理员）
   * @param notificationType 通知类型（可选，用于筛选）
   * @param isRead 是否已读（可选，用于筛选）
   * @returns 通知列表
   */
  async getAllNotifications(
    notificationType?: string,
    isRead?: boolean,
  ): Promise<AdminNotification[]> {
    try {
      const where: any = {};
      if (notificationType) {
        where.notification_type = notificationType;
      }
      if (isRead !== undefined) {
        where.is_read = isRead;
      }

      const notifications = await this.notificationRepository.find({
        where,
        order: {
          notification_time: 'DESC',
          createdAt: 'DESC',
        },
      });

      return notifications;
    } catch (error) {
      throw new BadRequestException('获取通知列表失败: ' + error.message);
    }
  }

  /**
   * 获取未读通知数量
   * @param notificationType 通知类型（可选，用于筛选）
   * @returns 未读通知数量
   */
  async getUnreadCount(notificationType?: string): Promise<number> {
    try {
      const where: any = { is_read: false };
      if (notificationType) {
        where.notification_type = notificationType;
      }
      return await this.notificationRepository.count({ where });
    } catch (error) {
      throw new BadRequestException('获取未读通知数量失败: ' + error.message);
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
        throw new HttpException('通知不存在', HttpStatus.NOT_FOUND);
      }

      await this.notificationRepository.update(notificationId, {
        is_read: true,
      });

      // 通过 WebSocket 推送已读状态更新
      if (this.notificationGateway) {
        try {
          this.notificationGateway.notifyNotificationReadUpdate(
            notificationId,
            true,
          );
          // 推送未读数量更新
          const unreadCount = await this.getUnreadCount(
            notification.notification_type,
          );
          this.notificationGateway.notifyUnreadCountUpdate(
            unreadCount,
            notification.notification_type,
          );
        } catch (error) {
          // WebSocket 推送失败不影响主流程
          console.error('WebSocket 推送失败:', error);
        }
      }

      return null;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('标记已读失败: ' + error.message);
    }
  }

  /**
   * 标记所有通知为已读
   * @param notificationType 通知类型（可选，用于筛选）
   * @returns null
   */
  async markAllAsRead(notificationType?: string): Promise<null> {
    try {
      const where: any = { is_read: false };
      if (notificationType) {
        where.notification_type = notificationType;
      }
      await this.notificationRepository.update(where, { is_read: true });

      // 通过 WebSocket 推送未读数量更新
      if (this.notificationGateway) {
        try {
          const unreadCount = await this.getUnreadCount(notificationType);
          this.notificationGateway.notifyUnreadCountUpdate(
            unreadCount,
            notificationType,
          );
        } catch (error) {
          // WebSocket 推送失败不影响主流程
          console.error('WebSocket 推送失败:', error);
        }
      }

      return null;
    } catch (error) {
      throw new BadRequestException('标记全部已读失败: ' + error.message);
    }
  }
}

