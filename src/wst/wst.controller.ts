import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WstService } from './wst.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';

/**
 * 聊天控制器
 * 提供聊天相关的HTTP接口
 */
@Controller('chat')
export class WstController {
  constructor(
    private readonly wstService: WstService,
    private readonly adminNotificationService: AdminNotificationService,
  ) {}

  /**
   * 获取客服的聊天房间列表（带最后一条消息和用户头像）
   * GET /chat/rooms
   * @param phone 微信用户手机号（可选，用于搜索）
   * @param pageIndex 页码，默认1
   * @param pageSize 每页数量，默认10
   */
  @Get('rooms')
  async getServiceRooms(
    @Request() req: any,
    @Query('phone') phone?: string,
    @Query('pageIndex') pageIndex: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    // 只允许客服访问
    const user = req.user;
    if (user.type === 'wechat') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    return await this.wstService.getServiceRooms(
      phone,
      Number(pageIndex),
      Number(pageSize),
    );
  }

  /**
   * 获取微信用户的聊天房间
   * GET /chat/room/my
   * 注意：使用绝对路径避免路由冲突
   */
  @Get('room/my')
  async getWechatUserRoom(@Request() req: any) {
    const user = req.user;
    if (!user) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    if (user.type !== 'wechat') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    return await this.wstService.getWechatUserRoom(user.userid);
  }

  /**
   * 获取房间内的消息列表
   * GET /chat/rooms/:roomId/messages
   * 如果 pageSize 为 -1 或 all，则返回全部消息
   */
  @Get('rooms/:roomId/messages')
  async getRoomMessages(
    @Param('roomId') roomId: number,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
    @Query('all') all: string = 'false',
  ) {
    // 如果 all=true 或 pageSize=-1，返回全部消息
    const getAll = all === 'true' || pageSize === '-1' || pageSize === 'all';
    
    if (getAll) {
      return await this.wstService.getAllRoomMessages(Number(roomId));
    }
    
    return await this.wstService.getRoomMessages(
      Number(roomId),
      Number(page),
      Number(pageSize),
    );
  }

  /**
   * 创建聊天房间
   * POST /chat/rooms
   */
  @Post('rooms')
  async createRoom(
    @Body() createChatRoomDto: CreateChatRoomDto,
    @Request() req: any,
  ) {
    const user = req.user;
    // 只有客服可以创建房间
    if (user.type === 'wechat') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    return await this.wstService.createRoom(createChatRoomDto);
  }

  /**
   * 获取单个房间信息
   * GET /chat/rooms/:roomId
   * 注意：这个路由不会与 room/my 冲突，因为路径不同
   */
  @Get('rooms/:roomId')
  async getRoom(@Param('roomId') roomId: number) {
    return await this.wstService.findOne(Number(roomId));
  }

  /**
   * 标记房间消息为已读
   * PUT /chat/rooms/:roomId/read
   * 进入房间后调用此接口，红点会消失
   */
  @Post('rooms/:roomId/read')
  async markRoomAsRead(@Param('roomId') roomId: number, @Request() req: any) {
    const user = req.user;
    // 只有客服可以标记消息为已读
    if (user.type === 'wechat') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    await this.wstService.markRoomAsRead(Number(roomId));
    
    // 标记该房间的消息通知为已读
    try {
      const notifications = await this.adminNotificationService.getAllNotifications(
        'chat-message',
        false,
      );
      const roomNotifications = notifications.filter(
        (n) =>
          n.extra_data?.chat_type === 'wechat-chat' &&
          n.extra_data?.room_id === Number(roomId),
      );
      for (const notif of roomNotifications) {
        await this.adminNotificationService.markAsRead(notif.id);
      }
    } catch (error) {
      // 通知标记失败不影响主流程
      console.error('标记通知已读失败', error);
    }
    
    return { message: '标记成功', success: true };
  }

  /**
   * 删除聊天房间
   * DELETE /chat/rooms/:roomId
   */
  @Delete('rooms/:roomId')
  async deleteRoom(@Param('roomId') roomId: number, @Request() req: any) {
    const user = req.user;
    // 只有客服可以删除房间
    if (user.type === 'wechat') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    await this.wstService.deleteRoom(Number(roomId));
    return { message: '删除成功' };
  }
}

