import {
  Controller,
  Get,
  Put,
  Post,
  Query,
  Param,
  Body,
  ParseIntPipe,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminNotificationService } from './admin-notification.service';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { AdminNotification } from './admin-notification.entity';

@Controller('admin-notification')
export class AdminNotificationController {
  constructor(
    private readonly notificationService: AdminNotificationService,
  ) {}

  /**
   * 创建通知
   * @param createDto 创建通知的DTO
   * @returns 通知
   */
  @Post()
  async create(
    @Body() createDto: CreateAdminNotificationDto,
    @Request() req: any,
  ): Promise<AdminNotification> {
    try {
      // 验证是否为管理员用户
      if (!req.user || !req.user.userid) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.notificationService.create(createDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '创建通知失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取所有通知列表（管理员）
   * @param req 请求对象，包含用户信息
   * @param notificationType 通知类型（可选）
   * @param isRead 是否已读（可选）
   * @returns 通知列表
   */
  @Get('list')
  async getAllNotifications(
    @Request() req: any,
    @Query('notificationType') notificationType?: string,
    @Query('isRead') isRead?: string,
  ): Promise<AdminNotification[]> {
    try {
      // 验证是否为管理员用户
      if (!req.user || !req.user.userid) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      const isReadBoolean =
        isRead !== undefined ? isRead === 'true' : undefined;
      return await this.notificationService.getAllNotifications(
        notificationType,
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
   * 获取未读通知数量（管理员）
   * @param req 请求对象，包含用户信息
   * @param notificationType 通知类型（可选）
   * @returns 未读通知数量
   */
  @Get('unread-count')
  async getUnreadCount(
    @Request() req: any,
    @Query('notificationType') notificationType?: string,
  ): Promise<{ count: number }> {
    try {
      // 验证是否为管理员用户
      if (!req.user || !req.user.userid) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      const count = await this.notificationService.getUnreadCount(
        notificationType,
      );
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
   * 获取未读通知列表（管理员）
   * @param req 请求对象，包含用户信息
   * @param notificationType 通知类型（可选）
   * @returns 未读通知列表
   */
  @Get('unread-list')
  async getUnreadNotifications(
    @Request() req: any,
    @Query('notificationType') notificationType?: string,
  ): Promise<AdminNotification[]> {
    try {
      // 验证是否为管理员用户
      if (!req.user || !req.user.userid) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.notificationService.getAllNotifications(
        notificationType,
        false, // 只获取未读通知
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取未读通知列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @param req 请求对象，包含用户信息
   * @returns null
   */
  @Put('read/:notificationId')
  async markAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Request() req: any,
  ): Promise<null> {
    try {
      // 验证是否为管理员用户
      if (!req.user || !req.user.userid) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.notificationService.markAsRead(notificationId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '标记已读失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 标记所有通知为已读（管理员）
   * @param req 请求对象，包含用户信息
   * @param notificationType 通知类型（可选）
   * @returns null
   */
  @Put('read-all')
  async markAllAsRead(
    @Request() req: any,
    @Query('notificationType') notificationType?: string,
  ): Promise<null> {
    try {
      // 验证是否为管理员用户
      if (!req.user || !req.user.userid) {
        throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
      }

      return await this.notificationService.markAllAsRead(notificationType);
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

