import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_notice')
export class PlatformNotice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '公告标题' })
  notice_title: string;

  @Column({ type: 'text', comment: '公告内容' })
  notice_content: string;

  @Column({ type: 'varchar', length: 10, comment: '公告类型：1-用户端公告，2-工匠端公告' })
  notice_type: string | number;

  @Column({ type: 'json', nullable: true, comment: '公告图片URL数组' })
  notice_image: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

