import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  ParseIntPipe,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SystemNotificationService } from './system-notification.service';
import { SystemNotification } from './system-notification.entity';

@Controller('system-notification')
export class SystemNotificationController {
  constructor(
    private readonly notificationService: SystemNotificationService,
  ) {}

  /**
   * 获取用户的通知列表
   * @param userId 用户ID（从token中获取或从query参数获取）
   * @param isRead 是否已读（可选，用于筛选）
   * @returns 通知列表
   */
  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('isRead') isRead?: string,
  ): Promise<SystemNotification[]> {
    const isReadBoolean =
      isRead !== undefined ? isRead === 'true' : undefined;
    return await this.notificationService.getUserNotifications(
      userId,
      isReadBoolean,
    );
  }

  /**
   * 根据token获取当前用户的通知列表
   * @param req 请求对象，包含用户信息
   * @param isRead 是否已读（可选，用于筛选）
   * @returns 通知列表
   */
  @Get('my')
  async getMyNotifications(
    @Request() req: any,
    @Query('isRead') isRead?: string,
  ): Promise<SystemNotification[]> {
    try {
      // 从token中获取userId（兼容不同的token格式）
      const userId = req.user?.userId || req.user?.userid;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      const isReadBoolean =
        isRead !== undefined ? isRead === 'true' : undefined;
      return await this.notificationService.getUserNotifications(
        userId,
        isReadBoolean,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取通知列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取用户未读通知数量（根据token获取当前用户）
   * @param req 请求对象，包含用户信息
   * @returns 未读通知数量
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    try {
      // 从token中获取userId（兼容不同的token格式）
      const userId = req.user?.userId || req.user?.userid;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      const count = await this.notificationService.getUnreadCount(userId);
      return { count };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取未读通知数量失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @returns null
   */
  @Put('read/:notificationId')
  async markAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ): Promise<null> {
    return await this.notificationService.markAsRead(notificationId);
  }

  /**
   * 标记用户的所有通知为已读（根据token获取当前用户）
   * @param req 请求对象，包含用户信息
   * @returns null
   */
  @Put('read-all')
  async markAllAsRead(@Request() req: any): Promise<null> {
    try {
      // 从token中获取userId（兼容不同的token格式）
      const userId = req.user?.userId || req.user?.userid;
      if (!userId) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.notificationService.markAllAsRead(userId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '标记全部已读失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

