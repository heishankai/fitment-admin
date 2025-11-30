import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('craftsman_user')
export class CraftsmanUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true, default: '叮当优+师傅' })
  nickname: string;

  @Column({
    nullable: true,
    default:
      'https://din-dang-zhi-zhuang.oss-cn-hangzhou.aliyuncs.com/uploads/1763214991038_s366qe_logo.png',
  })
  avatar: string;

  @Column({ nullable: true, default: false })
  isVerified: boolean;

  @Column({ nullable: true, default: false })
  isSkillVerified: boolean;

  @Column({ nullable: true, default: false })
  isHomePageVerified: boolean;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 9,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  latitude: number; // 纬度（数字类型，范围：-90 到 90，精度：9位小数）

  @Column({
    type: 'decimal',
    precision: 13,
    scale: 9,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  longitude: number; // 经度（数字类型，范围：-180 到 180，精度：9位小数）

  @Column({ type: 'varchar', length: 50, nullable: true })
  province: string; // 省份

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string; // 城市

  @Column({ type: 'varchar', length: 50, nullable: true })
  district: string; // 区县

  @Column({ type: 'int', default: 300, nullable: true })
  score: number; // 积分/评分，默认300分

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
