import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

@Entity('system_notification')
export class SystemNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '工匠用户ID' })
  userId: number;

  @ManyToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'userId' })
  user: CraftsmanUser;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '通知类型：is-verified-实名认证，is-skill-verified-技能认证，home-page-audit-首页审核',
  })
  notification_type: string;

  @Column({ comment: '通知标题' })
  title: string;

  @Column({ type: 'text', comment: '通知内容' })
  content: string;

  @Column({ default: false, comment: '是否已读' })
  is_read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

