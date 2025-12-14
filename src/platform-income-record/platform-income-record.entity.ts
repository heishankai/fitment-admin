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

@Entity('platform_income_record')
export class PlatformIncomeRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number; // 订单ID

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order; // 订单信息

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  materials_cost: number; // 订单的辅材费用，默认是0

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  total_service_fee: number; // 订单收取的服务费，默认是0

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
