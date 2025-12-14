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

  // 工价列表
  @Column({
    type: 'json',
    nullable: true,
  })
  work_prices: Array<{
    visiting_service_num: number; // 上门服务数量
    total_is_accepted: boolean; // 总验收状态
    total_price: number; // 施工费用（不包含工长费用）
    area: number | string; // 平米数
    total_service_fee: number; // 平台服务费
    craftsman_user_work_kind_name: string; // 当前用户的工种名称
    is_paid: boolean; // 用户是否已付款
    gangmaster_cost?: number; // 工长费用（仅当 craftsman_user_work_kind_name 为"工长"时存在）
    prices_list: Array<{
      id: number; // 工价id
      quantity: number; // 数量
      work_kind: {
        id: number; // 工种id
        work_kind_name: string; // 工种名称
      };
      work_price: string; // 工价
      work_title: string; // 工价标题
      labour_cost: {
        id: number; // 单位id
        labour_cost_name: string; // 单位名称
      };
      work_kind_id: number; // 工种id
      minimum_price: string; // 最低价格
      is_set_minimum_price: string; // 是否设置最低价格
      is_accepted?: boolean; // 验收状态（仅当work_kind_name为"水电"或"泥瓦工"时存在）
    }>; // 价格列表
  }>; // 工价列表数组

  // 子工价列表（当 work_prices 已存在时，后续添加的工价单）
  @Column({
    type: 'json',
    nullable: true,
  })
  sub_work_prices: Array<{
    visiting_service_num: number; // 上门服务费数量（子工价单为0）
    total_is_accepted: boolean; // 总验收状态
    total_price: number; // 施工费用（不包含工长费用）
    area: number | string; // 平米数
    total_service_fee: number; // 平台服务费
    craftsman_user_work_kind_name: string; // 当前用户的工种名称
    is_paid: boolean; // 用户是否已付款
    prices_list: Array<{
      id: number; // 工价id
      quantity: number; // 数量
      work_kind: {
        id: number; // 工种id
        work_kind_name: string; // 工种名称
      };
      work_price: string; // 工价
      work_title: string; // 工价标题
      labour_cost: {
        id: number; // 单位id
        labour_cost_name: string; // 单位名称
      };
      work_kind_id: number; // 工种id
      minimum_price: string; // 最低价格
      is_set_minimum_price: string; // 是否设置最低价格
      // 子工价单不包含验收字段
    }>; // 价格列表
  }>; // 子工价列表数组

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
