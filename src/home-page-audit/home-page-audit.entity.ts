import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('home_page_audit')
export class HomePageAudit {
  @PrimaryGeneratedColumn()
  id: number;

  // 关联的师傅用户ID
  @Column()
  userId: number;

  // 简介
  @Column({ nullable: true })
  intro: string;

  // 获奖情况
  @Column({ nullable: true })
  awards: string;

  // 获奖图片
  @Column({ type: 'json', nullable: true })
  awards_image: Array<{ url: string }>;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}

