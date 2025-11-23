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
import { WechatUser } from '../../wechat-user/wechat-user.entity';

/**
 * 工匠-微信用户聊天房间实体
 * 每个工匠用户和微信用户的组合对应一个聊天房间
 */
@Entity('craftsman_wechat_chat_room')
export class CraftsmanWechatChatRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '工匠用户ID' })
  craftsman_user_id: number;

  @ManyToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser;

  @Column({ comment: '微信用户ID' })
  wechat_user_id: number;

  @ManyToOne(() => WechatUser)
  @JoinColumn({ name: 'wechat_user_id' })
  wechat_user: WechatUser;

  @Column({ default: true, comment: '房间是否启用' })
  active: boolean;

  @OneToMany(
    () =>
      require('./craftsman-wechat-chat-message.entity')
        .CraftsmanWechatChatMessage,
    (message: any) => message.chat_room,
  )
  messages: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

