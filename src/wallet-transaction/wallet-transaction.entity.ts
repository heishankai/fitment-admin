import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

/**
 * 账户明细类型枚举
 * 1: 收入, 2: 支出
 */
export enum WalletTransactionType {
  INCOME = 1, // 收入
  EXPENSE = 2, // 支出
}

@Entity('wallet_transaction')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  craftsman_user_id: number; // 工匠用户ID

  @ManyToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser; // 工匠用户信息

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: '金额',
  })
  amount: number; // 金额

  @Column({
    type: 'int',
    comment: '类型：1收入，2支出',
  })
  type: number; // 类型：1收入，2支出

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '描述',
  })
  description: string; // 描述

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '关联订单ID',
  })
  order_id: string; // 关联订单ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
