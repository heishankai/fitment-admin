import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CraftsmanChatRoom } from './entities/craftsman-chat-room.entity';
import { CraftsmanChatMessage } from './entities/craftsman-chat-message.entity';
import { CreateCraftsmanChatRoomDto } from './dto/create-craftsman-chat-room.dto';

/**
 * 工匠聊天服务类
 * 提供工匠聊天相关的业务逻辑处理
 */
@Injectable()
export class CraftsmanChatService {
  constructor(
    @InjectRepository(CraftsmanChatRoom)
    private readonly chatRoomRepository: Repository<CraftsmanChatRoom>,
    @InjectRepository(CraftsmanChatMessage)
    private readonly chatMessageRepository: Repository<CraftsmanChatMessage>,
  ) {}

  /**
   * 根据工匠用户ID获取或创建聊天房间
   * @param craftsmanUserId 工匠用户ID
   * @returns 聊天房间
   */
  async getOrCreateRoomByCraftsmanUser(
    craftsmanUserId: number,
  ): Promise<CraftsmanChatRoom> {
    let room = await this.chatRoomRepository.findOne({
      where: { craftsman_user_id: craftsmanUserId, active: true },
      relations: ['craftsman_user'],
    });

    if (!room) {
      const newRoom = this.chatRoomRepository.create({
        craftsman_user_id: craftsmanUserId,
        active: true,
      });
      room = await this.chatRoomRepository.save(newRoom);
      // 重新加载以获取关联数据
      const reloadedRoom = await this.chatRoomRepository.findOne({
        where: { id: room.id },
        relations: ['craftsman_user'],
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
  async createRoom(
    createChatRoomDto: CreateCraftsmanChatRoomDto,
  ): Promise<CraftsmanChatRoom> {
    const existingRoom = await this.chatRoomRepository.findOne({
      where: {
        craftsman_user_id: createChatRoomDto.craftsman_user_id,
        active: true,
      },
    });

    if (existingRoom) {
      throw new HttpException('房间已存在', HttpStatus.BAD_REQUEST);
    }

    const room = this.chatRoomRepository.create({
      craftsman_user_id: createChatRoomDto.craftsman_user_id,
      active: true,
    });

    return await this.chatRoomRepository.save(room);
  }

  /**
   * 获取管理员的所有聊天房间列表（带最后一条消息）
   * @param phone 工匠用户手机号（可选，用于搜索）
   * @param pageIndex 页码，默认1
   * @param pageSize 每页数量，默认10
   * @returns 聊天房间列表和分页信息
   */
  async getAdminRooms(
    phone?: string,
    pageIndex: number = 1,
    pageSize: number = 10,
  ): Promise<any> {
    try {
      // 构建查询条件
      const queryBuilder = this.chatRoomRepository
        .createQueryBuilder('room')
        .leftJoinAndSelect('room.craftsman_user', 'craftsman_user')
        .where('room.active = :active', { active: true });

      // 如果提供了手机号，添加搜索条件
      if (phone) {
        queryBuilder.andWhere('craftsman_user.phone LIKE :phone', {
          phone: `%${phone}%`,
        });
      }

      // 获取总数
      const total = await queryBuilder.getCount();

      // 添加分页和排序
      const rooms = await queryBuilder
        .orderBy('room.updatedAt', 'DESC')
        .skip((pageIndex - 1) * pageSize)
        .take(pageSize)
        .getMany();

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
            craftsman_user: room.craftsman_user
              ? {
                  id: room.craftsman_user.id,
                  phone: room.craftsman_user.phone,
                  nickname: room.craftsman_user.nickname,
                  avatar: room.craftsman_user.avatar,
                  isVerified: room.craftsman_user.isVerified,
                  isSkillVerified: room.craftsman_user.isSkillVerified,
                  isHomePageVerified: room.craftsman_user.isHomePageVerified,
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

      // 返回结果（包含分页信息的完整格式）
      return {
        success: true,
        data: roomsWithLastMessage,
        code: 200,
        message: null,
        pageIndex,
        pageSize,
        total,
        pageTotal: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('分页查询聊天房间错误:', error);
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
   * 获取工匠用户的聊天房间（如果不存在则自动创建）
   * @param craftsmanUserId 工匠用户ID
   * @returns 聊天房间
   */
  async getCraftsmanUserRoom(craftsmanUserId: number): Promise<any> {
    // 先尝试获取现有房间
    let room = await this.chatRoomRepository.findOne({
      where: { craftsman_user_id: craftsmanUserId, active: true },
      relations: ['craftsman_user'],
    });

    // 如果房间不存在，自动创建一个
    if (!room) {
      room = this.chatRoomRepository.create({
        craftsman_user_id: craftsmanUserId,
        active: true,
      });
      room = await this.chatRoomRepository.save(room);

      // 重新加载以获取关联数据
      room = await this.chatRoomRepository.findOne({
        where: { id: room.id },
        relations: ['craftsman_user'],
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
      craftsman_user_id: room.craftsman_user_id,
      craftsman_user: room.craftsman_user
        ? {
            id: room.craftsman_user.id,
            phone: room.craftsman_user.phone,
            nickname: room.craftsman_user.nickname,
            avatar: room.craftsman_user.avatar,
            isVerified: room.craftsman_user.isVerified,
            isSkillVerified: room.craftsman_user.isSkillVerified,
            isHomePageVerified: room.craftsman_user.isHomePageVerified,
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
  ): Promise<{ messages: CraftsmanChatMessage[]; total: number }> {
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
  ): Promise<{ messages: CraftsmanChatMessage[]; total: number }> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId, active: true },
    });

    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    const [messages, total] =
      await this.chatMessageRepository.findAndCount({
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
  ): Promise<CraftsmanChatMessage> {
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
        sender_type: 'craftsman', // 只标记工匠用户发送的消息为已读
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
  }

  /**
   * 根据ID查找房间
   * @param id 房间ID
   * @returns 聊天房间
   */
  async findOne(id: number): Promise<CraftsmanChatRoom> {
    const room = await this.chatRoomRepository.findOne({
      where: { id, active: true },
      relations: ['craftsman_user'],
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

