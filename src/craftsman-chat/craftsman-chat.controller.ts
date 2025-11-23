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
import { CraftsmanChatService } from './craftsman-chat.service';
import { CreateCraftsmanChatRoomDto } from './dto/create-craftsman-chat-room.dto';

/**
 * 工匠聊天控制器
 * 提供工匠聊天相关的HTTP接口
 */
@Controller('craftsman-chat')
export class CraftsmanChatController {
  constructor(private readonly craftsmanChatService: CraftsmanChatService) {}

  /**
   * 获取管理员的聊天房间列表（带最后一条消息和用户头像）
   * GET /craftsman-chat/rooms
   */
  @Get('rooms')
  async getAdminRooms(@Request() req: any) {
    // 只允许管理员访问
    const user = req.user;
    if (user.type === 'craftsman') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    return await this.craftsmanChatService.getAdminRooms();
  }

  /**
   * 获取工匠用户的聊天房间
   * GET /craftsman-chat/room/my
   * 注意：使用绝对路径避免路由冲突
   */
  @Get('room/my')
  async getCraftsmanUserRoom(@Request() req: any) {
    const user = req.user;
    if (!user) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }
    if (user.type !== 'craftsman') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    const userId = user.userid || user.userId;
    return await this.craftsmanChatService.getCraftsmanUserRoom(userId);
  }

  /**
   * 获取房间内的消息列表
   * GET /craftsman-chat/rooms/:roomId/messages
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
      return await this.craftsmanChatService.getAllRoomMessages(Number(roomId));
    }

    return await this.craftsmanChatService.getRoomMessages(
      Number(roomId),
      Number(page),
      Number(pageSize),
    );
  }

  /**
   * 创建聊天房间
   * POST /craftsman-chat/rooms
   */
  @Post('rooms')
  async createRoom(
    @Body() createChatRoomDto: CreateCraftsmanChatRoomDto,
    @Request() req: any,
  ) {
    const user = req.user;
    // 只有管理员可以创建房间
    if (user.type === 'craftsman') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    return await this.craftsmanChatService.createRoom(createChatRoomDto);
  }

  /**
   * 获取单个房间信息
   * GET /craftsman-chat/rooms/:roomId
   * 注意：这个路由不会与 room/my 冲突，因为路径不同
   */
  @Get('rooms/:roomId')
  async getRoom(@Param('roomId') roomId: number) {
    return await this.craftsmanChatService.findOne(Number(roomId));
  }

  /**
   * 删除聊天房间
   * DELETE /craftsman-chat/rooms/:roomId
   */
  @Delete('rooms/:roomId')
  async deleteRoom(@Param('roomId') roomId: number, @Request() req: any) {
    const user = req.user;
    // 只有管理员可以删除房间
    if (user.type === 'craftsman') {
      throw new HttpException('无权限访问', HttpStatus.FORBIDDEN);
    }

    await this.craftsmanChatService.deleteRoom(Number(roomId));
    return { message: '删除成功' };
  }
}

