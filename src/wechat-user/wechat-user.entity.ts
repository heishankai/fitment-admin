import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('wechat_user')
export class WechatUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  openid: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  city: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
