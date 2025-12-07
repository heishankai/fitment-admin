import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

@Entity('wallet')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  craftsman_user_id: number; // 工匠用户ID

  @OneToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser; // 工匠用户信息

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '账户余额',
  })
  balance: number; // 账户余额

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '冻结金额',
  })
  freeze_money: number; // 冻结金额

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
