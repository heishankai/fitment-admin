import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 审核状态：1-已发布 2-审核中 3-审核失败 */
export const HOME_PAGE_AUDIT_STATUS = {
  PUBLISHED: 1,
  PENDING: 2,
  REJECTED: 3,
} as const;

export const HOME_PAGE_AUDIT_STATUS_MAP: Record<number, string> = {
  1: '已发布',
  2: '审核中',
  3: '审核失败',
};

@Entity('home_page_audit')
export class HomePageAudit {
  @PrimaryGeneratedColumn()
  id: number;

  // 关联的师傅用户ID
  @Column()
  userId: number;

  // 工地心得
  @Column({ type: 'varchar', length: 2000, nullable: true })
  publish_text: string;

  // 工地图片
  @Column({ type: 'json' })
  publish_images: string[];

  // 审核状态：1-已发布 2-审核中 3-审核失败
  @Column({ type: 'int', default: 2 })
  status: number;

  // 状态名称（冗余字段，便于查询展示）
  @Column({ type: 'varchar', length: 20, default: '审核中' })
  status_name: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
