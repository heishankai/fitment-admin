import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admin_notification')
export class AdminNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '通知标题' })
  title: string;

  @Column({ type: 'text', comment: '通知内容' })
  content: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '通知类型：get-price-获取报价通知，chat-message-消息通知，other-其他通知',
  })
  notification_type: string;

  @Column({ type: 'datetime', comment: '通知时间' })
  notification_time: Date;

  @Column({ default: false, comment: '是否已读' })
  is_read: boolean;

  @Column({ type: 'json', nullable: true, comment: '扩展数据（JSON格式）' })
  extra_data: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

