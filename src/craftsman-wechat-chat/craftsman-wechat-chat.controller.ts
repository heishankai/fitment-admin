import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CraftsmanWechatChatService } from './craftsman-wechat-chat.service';
import { CreateCraftsmanWechatChatRoomDto } from './dto/create-craftsman-wechat-chat-room.dto';

/**
 * 工匠-微信用户聊天控制器
 * 提供工匠和微信用户之间聊天相关的HTTP接口
 */
@Controller('craftsman-wechat-chat')
export class CraftsmanWechatChatController {
  constructor(
    private readonly craftsmanWechatChatService: CraftsmanWechatChatService,
  ) {}

  /**
   * 获取工匠用户的所有聊天房间列表
   * GET /craftsman-wechat-chat/rooms/craftsman
   */
  @Get('rooms/craftsman')
  async getCraftsmanRooms(@Request() req: any) {
    const user = req.user;
    if (!user) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    if (user.type !== 'craftsman') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    const userId = user.userid || user.userId;
    return await this.craftsmanWechatChatService.getCraftsmanRooms(userId);
  }

  /**
   * 获取微信用户的所有聊天房间列表
   * GET /craftsman-wechat-chat/rooms/wechat
   */
  @Get('rooms/wechat')
  async getWechatUserRooms(@Request() req: any) {
    const user = req.user;
    if (!user) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    if (user.type !== 'wechat') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    const userId = user.userid || user.userId;
    return await this.craftsmanWechatChatService.getWechatUserRooms(userId);
  }

  /**
   * 获取房间内的消息列表
   * GET /craftsman-wechat-chat/rooms/:roomId/messages
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
      return await this.craftsmanWechatChatService.getAllRoomMessages(
        Number(roomId),
      );
    }

    return await this.craftsmanWechatChatService.getRoomMessages(
      Number(roomId),
      Number(page),
      Number(pageSize),
    );
  }

  /**
   * 创建聊天房间
   * POST /craftsman-wechat-chat/rooms
   * 微信用户创建房间时，wechat_user_id 从 token 中获取
   */
  @Post('rooms')
  async createRoom(
    @Body() createChatRoomDto: CreateCraftsmanWechatChatRoomDto,
    @Request() req: any,
  ) {
    const user = req.user;
    // 如果用户是微信用户，从token中获取wechat_user_id
    if (user && user.type === 'wechat') {
      const wechatUserId = user.userid || user.userId;
      if (wechatUserId) {
        createChatRoomDto.wechat_user_id = wechatUserId;
      }
    }
    return await this.craftsmanWechatChatService.createRoom(createChatRoomDto);
  }

  /**
   * 获取单个房间信息
   * GET /craftsman-wechat-chat/rooms/:roomId
   */
  @Get('rooms/:roomId')
  async getRoom(@Param('roomId') roomId: number) {
    return await this.craftsmanWechatChatService.findOne(Number(roomId));
  }

  /**
   * 标记房间消息为已读
   * PUT /craftsman-wechat-chat/rooms/:roomId/read
   */
  @Put('rooms/:roomId/read')
  async markRoomAsRead(
    @Param('roomId') roomId: number,
    @Request() req: any,
  ) {
    const user = req.user;
    if (!user) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }

    const senderType = user.type === 'craftsman' ? 'craftsman' : 'wechat';
    await this.craftsmanWechatChatService.markRoomAsRead(
      Number(roomId),
      senderType,
    );
    return { message: '标记已读成功' };
  }

  /**
   * 删除聊天房间
   * DELETE /craftsman-wechat-chat/rooms/:roomId
   */
  @Delete('rooms/:roomId')
  async deleteRoom(@Param('roomId') roomId: number) {
    await this.craftsmanWechatChatService.deleteRoom(Number(roomId));
    return { message: '删除成功' };
  }
}
