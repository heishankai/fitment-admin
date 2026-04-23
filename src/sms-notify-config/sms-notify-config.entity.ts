import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * 客服短信通知号码配置（单例行 id 固定为 1）
 */
@Entity('sms_notify_config')
export class SmsNotifyConfig {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'json', nullable: true })
  phones: Array<{ phone: string }>;

  @UpdateDateColumn()
  updatedAt: Date;
}
