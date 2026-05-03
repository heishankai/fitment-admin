import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('is_skill_verified')
export class IsSkillVerified {
  @PrimaryGeneratedColumn()
  id: number;

  // 申报人工匠用户 ID（本条技能认证归属）
  @Column()
  userId: number;

  // 关联的工匠用户 ID（可选，如推荐人 / 绑定关系等）
  @Column({ type: 'int', nullable: true })
  relatedCraftsmanUserId: number | null;

  // 承诺图片
  @Column({ type: 'json', nullable: true })
  promise_image: Array<{ url: string }>;

  // 操作视频
  @Column({ type: 'json', nullable: true })
  operation_video: Array<{ url: string }>;

  // 工种编码
  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_code: string;

  // 工种名称
  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_name: string;

  // 从业年限
  @Column({ type: 'varchar', length: 50, nullable: true })
  work_years: string;

  // 技能介绍
  @Column({ type: 'varchar', length: 500, nullable: true })
  skill_intro: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}

