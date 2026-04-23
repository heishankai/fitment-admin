import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('get_price')
export class GetPrice {
  @PrimaryGeneratedColumn()
  id: number;

  // 面积
  @Column({ type: 'varchar', length: 50 })
  area: string;

  // 房屋类型（字符串，如：新房、老房、new、old 等）
  @Column({ type: 'varchar', length: 50 })
  houseType: string;

  // 位置（详细地址）
  @Column({ type: 'varchar', length: 500 })
  location: string;

  // 户型（如：3居室）
  @Column({ type: 'varchar', length: 50 })
  roomType: string;

  // 手机号
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

