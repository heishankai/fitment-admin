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

@Entity('construction_progress')
export class ConstructionProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number; // 订单ID

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order; // 订单信息

  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_name: string; // 所属工种名称

  @Column({ type: 'varchar', length: 50, nullable: true })
  work_kind_code: string; // 所属工种编码

  @Column({ nullable: true })
  craftsman_user_id: number; // 打卡工匠ID

  @Column({ type: 'varchar', length: 100 })
  start_time: string; // 上班打卡时间

  @Column({ type: 'varchar', length: 100 })
  end_time: string; // 下班打卡时间

  @Column({ type: 'varchar', length: 200 })
  location: string; // 打卡位置

  @Column({
    type: 'json',
    nullable: true,
  })
  photos: string[]; // 打卡照片

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
