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


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
