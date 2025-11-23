import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CraftsmanChatRoom } from './craftsman-chat-room.entity';

/**
 * 工匠聊天消息实体
 * 存储聊天房间中的所有消息
 */
@Entity('craftsman_chat_message')
export class CraftsmanChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '聊天房间ID' })
  chat_room_id: number;

  @ManyToOne(() => CraftsmanChatRoom)
  @JoinColumn({ name: 'chat_room_id' })
  chat_room: CraftsmanChatRoom;

  @Column({
    comment: '发送者类型：craftsman（工匠用户）或 admin（管理员）',
  })
  sender_type: string;

  @Column({ comment: '发送者ID' })
  sender_id: number;

  @Column({
    comment: '消息类型：text（文本）或 image（图片）',
    default: 'text',
  })
  message_type: string;

  @Column({ comment: '消息内容（文本内容或图片URL）' })
  content: string;

  @Column({ default: false, comment: '是否已读' })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

