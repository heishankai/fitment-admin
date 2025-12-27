import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 房屋类型枚举
 */
export enum HouseType {
  NEW = 'new', // 新房
  OLD = 'old', // 老房
}

/**
 * 房屋类型名称映射
 */
export const HouseTypeNameMap: Record<HouseType, string> = {
  [HouseType.NEW]: '新房',
  [HouseType.OLD]: '老房',
};

@Entity('get_price')
export class GetPrice {
  @PrimaryGeneratedColumn()
  id: number;

  // 面积
  @Column({ type: 'varchar', length: 50 })
  area: string;

  // 房屋类型：new（新房）或 old（老房）
  @Column({ type: 'varchar', length: 10 })
  houseType: string;

  // 房屋类型名称：新房 或 老房
  @Column({ type: 'varchar', length: 20 })
  houseTypeName: string;

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

