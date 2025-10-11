import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('case_query')
export class CaseQuery {
  @PrimaryGeneratedColumn()
  id: number;

  // 小区名称
  @Column()
  housing_name: string;

  // 改造类型 : 1 新房装修 2 旧房改造
  @Column()
  remodel_type: number;

  // 城市code
  @Column()
  city_code: string;

  // 城市名称
  @Column()
  city_name: string;

  // 平米数
  @Column()
  square_number: number;

  // 施工费用
  @Column()
  construction_cost: number;

  // 辅材费用
  @Column()
  auxiliary_material_cost: number;

  // 施工现场图
  @Column({ type: 'json', nullable: true })
  construction_image: string[];

  // 客厅及走廊
  @Column({ type: 'json', nullable: true })
  drawingroom_image: string[];

  // 阳台
  @Column({ type: 'json', nullable: true })
  balcony_image: string[];

  // 主卧
  @Column({ type: 'json', nullable: true })
  master_bedroom_image: string[];

  // 次卧
  @Column({ type: 'json', nullable: true })
  secondary_bedroom_image: string[];

  // 卫生间
  @Column({ type: 'json', nullable: true })
  bathroom_image: string[];

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
