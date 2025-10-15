import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// 工种配置接口
export interface WorkConfig {
  work_title: string; // 工种标题
  price: string; // 价格
  pricing_description: string; // 计价说明
  service_scope: string; // 服务范围
  display_images: string[]; // 展示图片
  service_details: string[]; // 服务详情
}

@Entity('whole_house_config')
export class WholeHouseConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  category_name: string; // 分类名称

  @Column({ type: 'json' })
  work_configs: WorkConfig[]; // 工种配置

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
