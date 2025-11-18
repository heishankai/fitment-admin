import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('work_type')
export class WorkType {
  @PrimaryGeneratedColumn()
  id: number;

  // 工种名称
  @Column()
  work_title: string;

  // 工种价格
  @Column({ type: 'varchar', length: 50 })
  work_price: any;

  // 计价说明
  @Column({ type: 'text', nullable: true })
  pricing_description: string;

  // 服务范围
  @Column({ type: 'text', nullable: true })
  service_scope: string;

  // 展示图片
  @Column({ type: 'json', nullable: true })
  display_images: string[];

  // 服务详情
  @Column({ type: 'json', nullable: true })
  service_details: {
    service_title?: string;
    service_desc?: string;
    service_image: string[];
  }[];

  // 工种
  @Column({ type: 'json', nullable: true })
  work_kind: {
    label: string;
    value: string | number;
  };

  // 人工成本
  @Column({ type: 'json', nullable: true })
  labour_cost: {
    label: string;
    value: string | number;
  };

  // 是否设置最低价
  @Column({ type: 'varchar', length: 1, nullable: true, default: '0' })
  is_set_minimum_price?: string; // '0':否, '1':是

  // 最低价格
  @Column({ type: 'varchar', length: 50, nullable: true })
  minimum_price?: string | number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
