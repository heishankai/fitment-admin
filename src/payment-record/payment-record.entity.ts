import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../order/order.entity';
import { WechatUser } from '../wechat-user/wechat-user.entity';

export enum PaymentRecordType {
  MATERIALS = 'materials',
  PLATFORM_SERVICE_FEE = 'platform_service_fee',
  GANGMASTER_COST = 'gangmaster_cost',
  WORK_PRICE = 'work_price',
  ORDER = 'order',
}

export const PaymentRecordTypeText: Record<PaymentRecordType, string> = {
  [PaymentRecordType.MATERIALS]: '辅材',
  [PaymentRecordType.PLATFORM_SERVICE_FEE]: '平台服务费',
  [PaymentRecordType.GANGMASTER_COST]: '工长费',
  [PaymentRecordType.WORK_PRICE]: '工价',
  [PaymentRecordType.ORDER]: '订单费用',
};

@Entity('payment_record')
export class PaymentRecord {
  @PrimaryGeneratedColumn({ comment: '付款记录ID' })
  id: number;

  @Column({ comment: '订单ID' })
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '订单编号快照',
  })
  order_no: string;

  @Column({ comment: '微信用户ID' })
  wechat_user_id: number;

  @ManyToOne(() => WechatUser)
  @JoinColumn({ name: 'wechat_user_id' })
  wechat_user: WechatUser;

  @Column({
    type: 'enum',
    enum: PaymentRecordType,
    comment: '付款类型',
  })
  payment_type: PaymentRecordType;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '付款类型中文名称',
  })
  payment_type_text: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '业务侧付款金额',
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  payment_amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '微信实际支付金额',
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  wx_payment_amount: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'wechat',
    comment: '付款渠道',
  })
  payment_channel: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '商户订单号',
  })
  out_trade_no: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '微信支付交易号',
  })
  transaction_id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '付款描述',
  })
  description: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '本次付款的辅材ID列表',
  })
  material_ids?: number[];

  @Column({
    type: 'json',
    nullable: true,
    comment: '本次付款的辅材快照',
  })
  materials_snapshot?: any[];

  @Column({
    type: 'json',
    nullable: true,
    comment: '本次付款的工价项ID列表',
  })
  work_price_item_ids?: number[];

  @Column({
    type: 'json',
    nullable: true,
    comment: '本次付款的工价项快照',
  })
  work_price_items_snapshot?: any[];

  @Column({
    type: 'json',
    nullable: true,
    comment: '微信支付回调 attach 原始数据',
  })
  raw_attach?: any;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}
