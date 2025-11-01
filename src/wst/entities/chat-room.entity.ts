import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WechatUser } from '../../wechat-user/wechat-user.entity';

/**
 * 聊天房间实体
 * 每个微信用户对应一个聊天房间（一个客服可以与多个微信用户聊天）
 */
@Entity('chat_room')
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '微信用户ID' })
  wechat_user_id: number;

  @ManyToOne(() => WechatUser)
  @JoinColumn({ name: 'wechat_user_id' })
  wechat_user: WechatUser;

  @Column({ default: true, comment: '房间是否启用' })
  active: boolean;

  @OneToMany(() => require('./chat-message.entity').ChatMessage, (message: any) => message.chat_room)
  messages: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

