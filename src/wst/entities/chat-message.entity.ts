import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';

/**
 * 聊天消息实体
 * 存储聊天房间中的所有消息
 */
@Entity('chat_message')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '聊天房间ID' })
  chat_room_id: number;

  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: 'chat_room_id' })
  chat_room: ChatRoom;

  @Column({ comment: '发送者类型：wechat（微信用户）或 service（客服）' })
  sender_type: string;

  @Column({ comment: '发送者ID' })
  sender_id: number;

  @Column({ comment: '消息类型：text（文本）或 image（图片）', default: 'text' })
  message_type: string;

  @Column({ comment: '消息内容（文本内容或图片URL）' })
  content: string;

  @Column({ default: false, comment: '是否已读' })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

