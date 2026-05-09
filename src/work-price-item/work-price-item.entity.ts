import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Order } from '../order/order.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

/**
 * 工价项实体
 */
@Entity('work_price_item')
export class WorkPriceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  order_id: number; // 订单id

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order; // 订单信息

  @Column()
  work_price_id: number; // 工价id

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  work_price: number; // 工价（当前的工价）

  @Column({ type: 'varchar', length: 200 })
  work_title: string; // 工价标题

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  quantity: number; // 工价数量

  @Column({ type: 'varchar', length: 50 })
  work_kind_name: string; // 工种名称

  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_code: string; // 工种编码

  @Column({ type: 'varchar', length: 50 })
  labour_cost_name: string; // 单位名称

  @Column({ type: 'varchar', length: 50, nullable: true })
  minimum_price: string; // 最低价格

  @Column({ type: 'varchar', length: 1, default: '0' })
  is_set_minimum_price: string; // 是否设置最低价格：是：'1'，否：'0'

  @Column({ type: 'boolean', default: false })
  is_paid: boolean; // 支付状态（默认是false）

  @Column({ type: 'boolean', default: false })
  is_accepted: boolean; // 验收状态（默认是false）

  @Column({ nullable: true })
  assigned_craftsman_id: number; // 当前执行工匠

  @ManyToOne(() => CraftsmanUser, { nullable: true })
  @JoinColumn({ name: 'assigned_craftsman_id' })
  assigned_craftsman: CraftsmanUser; // 当前执行工匠信息

  @Column({ nullable: true })
  gangmaster_user_id: number; // 工长用户ID（工长订单生成的工价快照）

  @ManyToOne(() => CraftsmanUser, { nullable: true })
  @JoinColumn({ name: 'gangmaster_user_id' })
  gangmaster_user: CraftsmanUser; // 工长用户信息

  @Column({ nullable: true })
  craftsman_user_id: number; // 工匠用户ID（工匠订单或已分配工价）

  @ManyToOne(() => CraftsmanUser, { nullable: true })
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser; // 工匠用户信息

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  settlement_amount: number; // 结算结果（如果 is_set_minimum_price === '1' && work_price * quantity < minimum_price，使用 minimum_price，否则使用 work_price * quantity）

  @Column({ type: 'varchar', length: 20 })
  created_by: string; // 工价来源 'gangmaster' | 'craftsman'

  @Column({ nullable: true })
  work_group_id: number; // 工价组ID：第1组=主工价组，第N组=子工价组

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  total_service_fee: number; // 平台服务费（仅子工价有，settlement_amount * 10%）

  @Column({ type: 'boolean', default: false })
  total_service_fee_is_paid: boolean; // 平台服务费是否已支付（仅子工价有）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 计算结算金额
   * 如果 is_set_minimum_price === '1' && work_price * quantity < minimum_price，使用 minimum_price
   * 否则使用 work_price * quantity
   */
  calculateSettlementAmount(): number {
    // 确保类型转换正确：quantity 和 work_price 可能是字符串或数字
    const quantityNum = Number(this.quantity) || 0;
    const workPriceNum = Number(this.work_price) || 0;
    const minimumPriceNum = this.minimum_price
      ? parseFloat(String(this.minimum_price))
      : null;

    // 计算单价 × 数量
    const totalPrice = workPriceNum * quantityNum;

    // 如果设置了最低价，且计算结果低于最低价，则使用最低价
    if (
      this.is_set_minimum_price === '1' &&
      minimumPriceNum !== null &&
      totalPrice < minimumPriceNum
    ) {
      return minimumPriceNum;
    }
    return totalPrice;
  }

  /**
   * 计算平台服务费（仅子工价）
   * 平台服务费 = settlement_amount * 10%
   */
  calculateServiceFee(): number {
    // 只有子工价（work_group_id > 1）才计算平台服务费
    if (this.work_group_id && this.work_group_id > 1) {
      const settlementAmount =
        this.settlement_amount || this.calculateSettlementAmount();
      return Number((settlementAmount * 0.1).toFixed(2));
    }
    return 0;
  }

  /**
   * 在插入前自动计算结算金额和平台服务费
   */
  @BeforeInsert()
  calculateSettlementBeforeInsert() {
    this.settlement_amount = this.calculateSettlementAmount();
    // 如果是子工价，计算平台服务费
    if (this.work_group_id && this.work_group_id > 1) {
      this.total_service_fee = this.calculateServiceFee();
    }
  }

  /**
   * 在更新前自动计算结算金额和平台服务费
   */
  @BeforeUpdate()
  calculateSettlementBeforeUpdate() {
    this.settlement_amount = this.calculateSettlementAmount();
    // 如果是子工价，计算平台服务费
    if (this.work_group_id && this.work_group_id > 1) {
      this.total_service_fee = this.calculateServiceFee();
    }
  }
}
