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
import { CraftsmanBankCard } from '../craftsman-bank-card/craftsman-bank-card.entity';

/**
 * 提现状态枚举
 * 1: 审核中, 2: 已完成, 3: 已拒绝
 */
export enum WithdrawStatus {
  PENDING = 1, // 审核中
  COMPLETED = 2, // 已完成
  REJECTED = 3, // 已拒绝
}

@Entity('withdraw')
export class Withdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  craftsman_user_id: number; // 工匠用户ID

  @ManyToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser; // 工匠用户信息

  @Column({ nullable: true })
  craftsman_bank_card_id: number | null; // 银行卡ID

  @ManyToOne(() => CraftsmanBankCard, { nullable: true })
  @JoinColumn({ name: 'craftsman_bank_card_id' })
  craftsman_bank_card: CraftsmanBankCard; // 银行卡信息

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: number; // 提现金额

  @Column({ type: 'int', default: WithdrawStatus.PENDING })
  status: number; // 状态：1已申请，2已完成，3已拒绝

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
