import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';

/**
 * 聊天服务类
 * 提供聊天相关的业务逻辑处理
 */
@Injectable()
export class WstService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * 根据微信用户ID获取或创建聊天房间
   * @param wechatUserId 微信用户ID
   * @returns 聊天房间
   */
  async getOrCreateRoomByWechatUser(wechatUserId: number): Promise<ChatRoom> {
    let room = await this.chatRoomRepository.findOne({
      where: { wechat_user_id: wechatUserId, active: true },
      relations: ['wechat_user'],
    });

    if (!room) {
      const newRoom = this.chatRoomRepository.create({
        wechat_user_id: wechatUserId,
        active: true,
      });
      room = await this.chatRoomRepository.save(newRoom);
      // 重新加载以获取关联数据
      const reloadedRoom = await this.chatRoomRepository.findOne({
        where: { id: room.id },
        relations: ['wechat_user'],
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
   * 创建聊天房间
   * @param createChatRoomDto 创建聊天房间的DTO
   * @returns 聊天房间
   */
  async createRoom(createChatRoomDto: CreateChatRoomDto): Promise<ChatRoom> {
    const existingRoom = await this.chatRoomRepository.findOne({
      where: {
        wechat_user_id: createChatRoomDto.wechat_user_id,
        active: true,
      },
    });

    if (existingRoom) {
      throw new HttpException('房间已存在', HttpStatus.BAD_REQUEST);
    }

    const room = this.chatRoomRepository.create({
      wechat_user_id: createChatRoomDto.wechat_user_id,
      active: true,
    });

    return await this.chatRoomRepository.save(room);
  }

  /**
   * 获取客服的所有聊天房间列表（带最后一条消息）
   * @returns 聊天房间列表
   */
  async getServiceRooms(): Promise<any[]> {
    const rooms = await this.chatRoomRepository.find({
      where: { active: true },
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
   * 获取微信用户的聊天房间（如果不存在则自动创建）
   * @param wechatUserId 微信用户ID
   * @returns 聊天房间
   */
  async getWechatUserRoom(wechatUserId: number): Promise<any> {
    // 先尝试获取现有房间
    let room = await this.chatRoomRepository.findOne({
      where: { wechat_user_id: wechatUserId, active: true },
      relations: ['wechat_user'],
    });

    // 如果房间不存在，自动创建一个
    if (!room) {
      room = this.chatRoomRepository.create({
        wechat_user_id: wechatUserId,
        active: true,
      });
      room = await this.chatRoomRepository.save(room);

      // 重新加载以获取关联数据
      room = await this.chatRoomRepository.findOne({
        where: { id: room.id },
        relations: ['wechat_user'],
      });
    }

    if (!room) {
      throw new HttpException('创建房间失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const lastMessage = await this.chatMessageRepository.findOne({
      where: { chat_room_id: room.id },
      order: { createdAt: 'DESC' },
    });

    return {
      id: room.id,
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
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  /**
   * 获取房间内的所有消息（不分页）
   * @param roomId 房间ID
   * @returns 消息列表
   */
  async getAllRoomMessages(
    roomId: number,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
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
  ): Promise<{ messages: ChatMessage[]; total: number }> {
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
  ): Promise<ChatMessage> {
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
   */
  async markRoomAsRead(roomId: number): Promise<void> {
    await this.chatMessageRepository.update(
      {
        chat_room_id: roomId,
        sender_type: 'wechat', // 只标记微信用户发送的消息为已读
        read: false,
      },
      { read: true },
    );
  }

  /**
   * 删除聊天房间（软删除，将active设为false）
   * @param roomId 房间ID
   */
  async deleteRoom(roomId: number): Promise<void> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 软删除：将active设为false
    const result = await this.chatRoomRepository.update(roomId, {
      active: false,
    });

    // 验证删除是否成功
    if (result.affected === 0) {
      throw new HttpException('删除失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 也可以选择硬删除所有消息
    // await this.chatMessageRepository.delete({ chat_room_id: roomId });
  }

  /**
   * 根据ID查找房间
   * @param id 房间ID
   * @returns 聊天房间
   */
  async findOne(id: number): Promise<ChatRoom> {
    const room = await this.chatRoomRepository.findOne({
      where: { id, active: true },
      relations: ['wechat_user'],
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    return room;
  }
}
