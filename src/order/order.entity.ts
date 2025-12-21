import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WechatUser } from '../wechat-user/wechat-user.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { WorkPriceItem } from '../work-price-item/work-price-item.entity';

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
  houseTypeName: string; // 房屋类型：新房/老房

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

  // 订单编号
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  order_no: string; // 订单号：[业务前缀][时间戳][当日递增序列]，例如：GM20250308152330000123、CM20250308152330000456

  // 订单类型
  @Column({ type: 'varchar', length: 20, nullable: true })
  order_type: string; // 订单类型：工长订单:gangmaster ,工匠订单:craftsman

  // 订单状态
  @Column({ type: 'int', default: OrderStatus.PENDING })
  order_status: number; // 订单状态：1: 待接单, 2: 已接单, 3: 已完成, 4: 已取消

  @Column({ type: 'varchar', length: 50, default: '待接单' })
  order_status_name: string; // 订单状态名称

  // 平台服务费和上门服务数量（仅在主工价生成时计算得出）
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_service_fee: number; // 平台服务费

  @Column({ type: 'boolean', default: false })
  total_service_fee_is_paid: boolean; // 平台服务费是否已支付

  @Column({ type: 'int', nullable: true })
  visiting_service_num: number; // 上门服务数量

  @Column({ type: 'int', nullable: true })
  gangmaster_cost: number; // 工长工费

  // 订单关联关系
  @Column({ nullable: true })
  parent_order_id: number; // 指向工长订单id（仅被分配的工匠订单使用）

  @Column({ type: 'boolean', default: false })
  is_assigned: boolean; // 是否是被分配的订单

  // 工价项关联（通过 WorkPriceItem 实体表管理，不再使用 JSON 字段）
  @OneToMany(() => WorkPriceItem, (workPriceItem) => workPriceItem.order)
  work_price_items: WorkPriceItem[]; // 工价项列表

  // 临时保留旧字段以避免编译错误（后续会重构移除）
  @Column({
    type: 'json',
    nullable: true,
  })
  work_prices?: any; // 旧的主工价列表（已废弃，使用 work_price_items）

  @Column({
    type: 'json',
    nullable: true,
  })
  sub_work_prices?: any; // 旧的子工价列表（已废弃，使用 work_price_items）

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
