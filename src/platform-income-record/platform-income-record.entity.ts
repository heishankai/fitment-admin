import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../order/order.entity';

/**
 * 费用类型枚举
 */
export enum CostType {
  MATERIALS = 'materials', // 辅材费用
  SERVICE_FEE = 'service_fee', // 平台服务费
}

/**
 * 费用类型中文映射
 */
export const CostTypeText: Record<CostType, string> = {
  [CostType.SERVICE_FEE]: '平台服务费',
  [CostType.MATERIALS]: '辅材费用',
};

@Entity('platform_income_record')
export class PlatformIncomeRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number; // 订单ID

  @Column({ type: 'varchar', length: 50, nullable: true })
  order_no: string; // 订单编号

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order; // 订单信息

  @Column({
    type: 'enum',
    enum: CostType,
  })
  cost_type: CostType; // 费用类型：'materials' | 'service_fee'

  @Column({ type: 'varchar', length: 50, nullable: true })
  cost_type_text: string; // 费用类型中文名称

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  cost_amount: number; // 费用金额

  @CreateDateColumn()
  createdAt: Date;
}
