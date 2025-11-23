import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CraftsmanWechatChatRoom } from './entities/craftsman-wechat-chat-room.entity';
import { CraftsmanWechatChatMessage } from './entities/craftsman-wechat-chat-message.entity';
import { CreateCraftsmanWechatChatRoomDto } from './dto/create-craftsman-wechat-chat-room.dto';

/**
 * 工匠-微信用户聊天服务类
 * 提供工匠和微信用户之间的聊天业务逻辑处理
 */
@Injectable()
export class CraftsmanWechatChatService {
  constructor(
    @InjectRepository(CraftsmanWechatChatRoom)
    private readonly chatRoomRepository: Repository<CraftsmanWechatChatRoom>,
    @InjectRepository(CraftsmanWechatChatMessage)
    private readonly chatMessageRepository: Repository<CraftsmanWechatChatMessage>,
  ) {}

  /**
   * 根据工匠用户ID和微信用户ID获取或创建聊天房间
   * @param craftsmanUserId 工匠用户ID
   * @param wechatUserId 微信用户ID
   * @returns 聊天房间
   */
  async getOrCreateRoom(
    craftsmanUserId: number,
    wechatUserId: number,
  ): Promise<CraftsmanWechatChatRoom> {
    let room = await this.chatRoomRepository.findOne({
      where: {
        craftsman_user_id: craftsmanUserId,
        wechat_user_id: wechatUserId,
        active: true,
      },
      relations: ['craftsman_user', 'wechat_user'],
    });

    if (!room) {
      const newRoom = this.chatRoomRepository.create({
        craftsman_user_id: craftsmanUserId,
        wechat_user_id: wechatUserId,
        active: true,
      });
      room = await this.chatRoomRepository.save(newRoom);
      // 重新加载以获取关联数据
      const reloadedRoom = await this.chatRoomRepository.findOne({
        where: { id: room.id },
        relations: ['craftsman_user', 'wechat_user'],
      });
      if (!reloadedRoom) {
        throw new HttpException(
          '创建房间失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      room = reloadedRoom;
    }

    return room;
  }

  /**
   * 创建聊天房间（如果已存在则返回现有房间）
   * @param createChatRoomDto 创建聊天房间的DTO
   * @returns 聊天房间
   */
  async createRoom(
    createChatRoomDto: CreateCraftsmanWechatChatRoomDto,
  ): Promise<CraftsmanWechatChatRoom> {
    if (!createChatRoomDto.wechat_user_id) {
      throw new HttpException('微信用户ID不能为空', HttpStatus.BAD_REQUEST);
    }

    const existingRoom = await this.chatRoomRepository.findOne({
      where: {
        craftsman_user_id: createChatRoomDto.craftsman_user_id,
        wechat_user_id: createChatRoomDto.wechat_user_id,
        active: true,
      },
      relations: ['craftsman_user', 'wechat_user'],
    });

    // 如果房间已存在，直接返回
    if (existingRoom) {
      return existingRoom;
    }

    // 创建新房间
    const room = this.chatRoomRepository.create({
      craftsman_user_id: createChatRoomDto.craftsman_user_id,
      wechat_user_id: createChatRoomDto.wechat_user_id,
      active: true,
    });

    const savedRoom = await this.chatRoomRepository.save(room);
    
    // 重新加载以获取关联数据
    const reloadedRoom = await this.chatRoomRepository.findOne({
      where: { id: savedRoom.id },
      relations: ['craftsman_user', 'wechat_user'],
    });

    if (!reloadedRoom) {
      throw new HttpException(
        '创建房间失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return reloadedRoom;
  }

  /**
   * 获取工匠用户的所有聊天房间列表（带最后一条消息）
   * @param craftsmanUserId 工匠用户ID
   * @returns 聊天房间列表
   */
  async getCraftsmanRooms(craftsmanUserId: number): Promise<any[]> {
    const rooms = await this.chatRoomRepository.find({
      where: { craftsman_user_id: craftsmanUserId, active: true },
      relations: ['wechat_user'],
      order: { updatedAt: 'DESC' },
    });

    // 获取每个房间的最后一条消息
    const roomsWithLastMessage = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = await this.chatMessageRepository.findOne({
          where: { chat_room_id: room.id },
          order: { createdAt: 'DESC' },
        });

        return {
          id: room.id,
          craftsman_user_id: room.craftsman_user_id,
          wechat_user_id: room.wechat_user_id,
          wechat_user: room.wechat_user
            ? {
                id: room.wechat_user.id,
                openid: room.wechat_user.openid,
                phone: room.wechat_user.phone,
                nickname: room.wechat_user.nickname,
                avatar: room.wechat_user.avatar,
                city: room.wechat_user.city,
                createdAt: room.wechat_user.createdAt,
                updatedAt: room.wechat_user.updatedAt,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                sender_type: lastMessage.sender_type,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount: await this.chatMessageRepository.count({
            where: {
              chat_room_id: room.id,
              read: false,
              sender_type: 'wechat', // 只统计微信用户发送的未读消息
            },
          }),
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      }),
    );

    return roomsWithLastMessage;
  }

  /**
   * 获取微信用户的所有聊天房间列表（带最后一条消息）
   * @param wechatUserId 微信用户ID
   * @returns 聊天房间列表
   */
  async getWechatUserRooms(wechatUserId: number): Promise<any[]> {
    const rooms = await this.chatRoomRepository.find({
      where: { wechat_user_id: wechatUserId, active: true },
      relations: ['craftsman_user'],
      order: { updatedAt: 'DESC' },
    });

    // 获取每个房间的最后一条消息
    const roomsWithLastMessage = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = await this.chatMessageRepository.findOne({
          where: { chat_room_id: room.id },
          order: { createdAt: 'DESC' },
        });

        return {
          id: room.id,
          craftsman_user_id: room.craftsman_user_id,
          wechat_user_id: room.wechat_user_id,
          craftsman_user: room.craftsman_user
            ? {
                id: room.craftsman_user.id,
                phone: room.craftsman_user.phone,
                nickname: room.craftsman_user.nickname,
                avatar: room.craftsman_user.avatar,
                createdAt: room.craftsman_user.createdAt,
                updatedAt: room.craftsman_user.updatedAt,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                sender_type: lastMessage.sender_type,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount: await this.chatMessageRepository.count({
            where: {
              chat_room_id: room.id,
              read: false,
              sender_type: 'craftsman', // 只统计工匠用户发送的未读消息
            },
          }),
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      }),
    );

    return roomsWithLastMessage;
  }

  /**
   * 获取房间内的所有消息（不分页）
   * @param roomId 房间ID
   * @returns 消息列表
   */
  async getAllRoomMessages(
    roomId: number,
  ): Promise<{ messages: CraftsmanWechatChatMessage[]; total: number }> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId, active: true },
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    const messages = await this.chatMessageRepository.find({
      where: { chat_room_id: roomId },
      order: { createdAt: 'ASC' }, // 正序排列
    });

    return { messages, total: messages.length };
  }

  /**
   * 获取房间内的消息列表（分页）
   * @param roomId 房间ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 消息列表
   */
  async getRoomMessages(
    roomId: number,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ messages: CraftsmanWechatChatMessage[]; total: number }> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId, active: true },
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { chat_room_id: roomId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 反转数组，使消息按时间正序排列
    messages.reverse();

    return { messages, total };
  }

  /**
   * 创建消息
   * @param roomId 房间ID
   * @param senderType 发送者类型
   * @param senderId 发送者ID
   * @param content 消息内容（文本内容或图片URL）
   * @param messageType 消息类型：text（文本）或 image（图片），默认为text
   * @returns 消息
   */
  async createMessage(
    roomId: number,
    senderType: string,
    senderId: number,
    content: string,
    messageType: string = 'text',
  ): Promise<CraftsmanWechatChatMessage> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId, active: true },
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    const message = this.chatMessageRepository.create({
      chat_room_id: roomId,
      sender_type: senderType,
      sender_id: senderId,
      message_type: messageType,
      content,
      read: false,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    // 更新房间的更新时间
    await this.chatRoomRepository.update(roomId, {
      updatedAt: new Date(),
    });

    return savedMessage;
  }

  /**
   * 标记房间的所有消息为已读
   * @param roomId 房间ID
   * @param senderType 发送者类型（只标记对方发送的消息为已读）
   */
  async markRoomAsRead(roomId: number, senderType: string): Promise<void> {
    // 标记对方发送的消息为已读
    const oppositeSenderType =
      senderType === 'craftsman' ? 'wechat' : 'craftsman';

    await this.chatMessageRepository.update(
      {
        chat_room_id: roomId,
        sender_type: oppositeSenderType,
        read: false,
      },
      { read: true },
    );
  }

  /**
   * 删除聊天房间（硬删除，直接从数据库删除房间和所有消息）
   * @param roomId 房间ID
   */
  async deleteRoom(roomId: number): Promise<void> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 先删除房间内的所有消息
    await this.chatMessageRepository.delete({
      chat_room_id: roomId,
    });

    // 然后删除房间本身
    const result = await this.chatRoomRepository.delete(roomId);

    // 验证删除是否成功
    if (result.affected === 0) {
      throw new HttpException('删除失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 根据ID查找房间
   * @param id 房间ID
   * @returns 聊天房间
   */
  async findOne(id: number): Promise<CraftsmanWechatChatRoom> {
    const room = await this.chatRoomRepository.findOne({
      where: { id, active: true },
      relations: ['craftsman_user', 'wechat_user'],
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    return room;
  }

  /**
   * 检查房间是否有消息
   * @param roomId 房间ID
   * @returns 是否有消息
   */
  async hasMessages(roomId: number): Promise<boolean> {
    const count = await this.chatMessageRepository.count({
      where: { chat_room_id: roomId },
    });
    return count > 0;
  }
}

