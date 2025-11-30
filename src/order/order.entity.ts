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
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

/**
 * 订单状态枚举
 * 1: 待接单, 2: 已接单, 3: 已完成, 4: 已取消
 */
export enum OrderStatus {
  PENDING = 1, // 待接单
  ACCEPTED = 2, // 已接单
  COMPLETED = 3, // 已完成
  CANCELLED = 4, // 已取消
}

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // 订单信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  area: string; // 面积

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string; // 城市

  @Column({ type: 'varchar', length: 50, nullable: true })
  district: string; // 区县

  @Column({ type: 'varchar', length: 50, nullable: true })
  houseType: string; // 房屋类型：new/old

  @Column({ type: 'varchar', length: 50, nullable: true })
  roomType: string; // 户型：如"2居室"

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string; // 详细地址

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
  latitude: number; // 纬度

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
  longitude: number; // 经度

  @Column({ type: 'varchar', length: 50, nullable: true })
  province: string; // 省份

  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_name: string; // 工种名称

  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_id: string; // 工种ID

  // 订单状态
  @Column({ type: 'int', default: OrderStatus.PENDING })
  order_status: number; // 订单状态：1: 待接单, 2: 已接单, 3: 已完成, 4: 已取消

  @Column({ type: 'varchar', length: 50, default: '待接单' })
  order_status_name: string; // 订单状态名称

  // 施工进度
  @Column({
    type: 'json',
    nullable: true,
  })
  construction_progress: Array<{
    start_time: string; // 上班打卡时间
    end_time: string; // 下班打卡时间
    location: string; // 打卡位置
    photos: string[]; // 打卡照片
  }>; // 施工进度数组

  // 辅材列表
  @Column({
    type: 'json',
    nullable: true,
  })
  materials_list: Array<{
    total_price: number; // 总价
    commodity_list: Array<{
      id: number; // 商品ID
      commodity_name: string; // 商品名称
      commodity_price: string; // 商品价格
      commodity_unit: string; // 商品单位
      quantity: number; // 数量
      commodity_cover?: string[]; // 商品封面
    }>; // 商品列表
  }>; // 辅材列表数组

  // 工价列表
  @Column({
    type: 'json',
    nullable: true,
  })
  work_prices: Array<{
    total_price: number; // 总价
    prices_list: any[]; // 价格列表（可存储任意数据）
  }>; // 工价列表数组

  // 关联用户
  @Column()
  wechat_user_id: number; // 微信用户ID

  @ManyToOne(() => WechatUser)
  @JoinColumn({ name: 'wechat_user_id' })
  wechat_user: WechatUser; // 微信用户信息

  @Column({ nullable: true })
  craftsman_user_id: number; // 工匠用户ID（接单后才有）

  @ManyToOne(() => CraftsmanUser, { nullable: true })
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser; // 工匠用户信息

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

