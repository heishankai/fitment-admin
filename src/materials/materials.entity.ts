import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../order/order.entity';

@Entity('materials')
export class Materials {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number; // 订单ID

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order; // 订单信息

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: number; // 总价

  @Column({ type: 'boolean', default: false })
  is_paid: boolean; // 用户是否已付款

  @Column({ type: 'boolean', default: false })
  total_is_accepted: boolean; // 总验收状态

  @Column({
    type: 'json',
  })
  commodity_list: Array<{
    id: number; // 商品ID
    commodity_name: string; // 商品名称
    commodity_price: string; // 商品价格
    commodity_unit: string; // 商品单位
    quantity: number; // 数量
    commodity_cover?: string[]; // 商品封面
  }>; // 商品列表

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
