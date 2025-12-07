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

@Entity('craftsman_bank_card')
export class CraftsmanBankCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  craftsman_user_id: number; // 工匠用户ID

  @ManyToOne(() => CraftsmanUser)
  @JoinColumn({ name: 'craftsman_user_id' })
  craftsman_user: CraftsmanUser; // 工匠用户信息

  @Column({ type: 'varchar', length: 100 })
  bank_name: string; // 银行名称

  @Column({ type: 'varchar', length: 50 })
  card_number: string; // 银行卡号

  @Column({ type: 'varchar', length: 200, nullable: true })
  bank_branch: string; // 开户行

  @Column({ type: 'varchar', length: 50 })
  name: string; // 姓名

  @Column({ type: 'varchar', length: 20 })
  phone: string; // 手机号

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
