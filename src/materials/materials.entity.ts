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

  @Column({ type: 'boolean', default: false })
  is_paid: boolean; // 用户是否已付款

  @Column({ type: 'boolean', default: false })
  is_accepted: boolean; // 验收状态

  @Column()
  commodity_id: number; // 商品ID

  @Column({ type: 'varchar', length: 200 })
  commodity_name: string; // 商品名称

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commodity_price: number; // 商品价格

  @Column({ type: 'varchar', length: 50 })
  commodity_unit: string; // 商品单位

  @Column({ type: 'int' })
  quantity: number; // 数量

  @Column({
    type: 'json',
    nullable: true,
  })
  commodity_cover: string[]; // 商品封面

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  settlement_amount: number; // 结算结果 （quantity * commodity_price）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
