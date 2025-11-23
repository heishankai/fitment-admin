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
import { CraftsmanUser } from '../../craftsman-user/craftsman-user.entity';

/**
 * 工匠聊天房间实体
 * 每个工匠用户对应一个聊天房间（一个管理员可以与多个工匠用户聊天）
 */
@Entity('craftsman_chat_room')
export class CraftsmanChatRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '工匠用户ID' })
  craftsman_user_id: number;

  @ManyToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser;

  @Column({ default: true, comment: '房间是否启用' })
  active: boolean;

  @OneToMany(
    () => require('./craftsman-chat-message.entity').CraftsmanChatMessage,
    (message: any) => message.chat_room,
  )
  messages: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

