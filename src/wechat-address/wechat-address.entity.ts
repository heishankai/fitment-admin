import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WechatUser } from '../wechat-user/wechat-user.entity';

@Entity('wechat_address')
export class WechatAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '业主姓名' })
  owner_name: string;

  @Column({ comment: '手机号码' })
  owner_phone: string;

  @Column({ comment: '城市' })
  city_name: string;

  @Column({ comment: '城市代码' })
  city_code: string;

  @Column({ comment: '详细地址' })
  detailed_address: string;

  @Column({ comment: '小区' })
  community_name: string;

  @Column({ comment: '楼栋房号' })
  building_number: string;

  @Column({ default: false, comment: '是否是默认地址' })
  default: boolean;

  @Column({ comment: '微信用户ID' })
  wechat_user_id: number;

  @ManyToOne(() => WechatUser)
  @JoinColumn({ name: 'wechat_user_id' })
  wechat_user: WechatUser;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
