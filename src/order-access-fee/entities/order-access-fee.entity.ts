import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('order_access_fee')
export class OrderAccessFee {
  @PrimaryGeneratedColumn()
  id: number; // 自增主键，bigint

  @Column({
    type: 'varchar',
    length: 32,
    unique: true, // 唯一索引
    nullable: false,
    comment: '订单号，业务标识',
  })
  order_no: string; // 支付订单号

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      from: (value: string) => value,
      to: (value: string) => value,
    },
    comment: '订单金额（元）',
  })
  amount: string;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '支付状态（0-待支付，1-已支付，2-支付失败）',
  })
  status: number; // 支付状态（0-待支付，1-已支付，2-支付失败）
  // 未过期
  @Column({
    type: 'tinyint',
    default: 0,
    comment: '是否过期（0-未过期，1-已过期）',
  })
  is_expired: number; // 是否过期（0-未过期，1-已过期）

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '额度是否已经使用（0-未使用，1-已使用）',
  })
  is_used: number; // 额度是否已经使用（0-未使用，1-已使用）

  @Column({
    type: 'int',
    nullable: false,
    comment: '用户id',
  })
  user_id: number; // 用户id

  //关联订单id
  @Column({
    type: 'int',
    nullable: true,
    comment: '关联订单id',
  })
  main_order_id: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
