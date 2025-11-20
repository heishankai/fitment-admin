import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('is_verified')
export class IsVerified {
  @PrimaryGeneratedColumn()
  id: number;

  // 关联的师傅用户ID
  @Column()
  userId: number;

  // 证件正面图片
  @Column({ type: 'json', nullable: true })
  card_front_image: Array<{ url: string }>;

  // 证件反面图片
  @Column({ type: 'json', nullable: true })
  card_reverse_image: Array<{ url: string }>;

  // 证件名称
  @Column({ nullable: true })
  card_name: string;

  // 证件号码
  @Column({ nullable: true })
  card_number: string;

  // 证件住址
  @Column({ nullable: true })
  card_address: string;

  // 证件有效期开始日期
  @Column({ nullable: true })
  card_start_date: string;

  // 证件有效期结束日期
  @Column({ nullable: true })
  card_end_date: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}

