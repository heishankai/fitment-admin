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

  // 关联的师傅用户ID
  @Column()
  userId: number;

  // 承诺图片
  @Column({ type: 'json', nullable: true })
  promise_image: Array<{ url: string }>;

  // 操作视频
  @Column({ type: 'json', nullable: true })
  operation_video: Array<{ url: string }>;

  // 工种ID
  @Column({ nullable: true })
  workKindId: string;

  // 工种名称
  @Column({ nullable: true })
  workKindName: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}

