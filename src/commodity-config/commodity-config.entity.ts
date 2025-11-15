import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('commodity_config')
export class CommodityConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  category_id: number; // 所属类目ID（数字类型）

  @Column()
  category_name: string; // 所属类目名称

  @Column({ length: 100 })
  commodity_name: string; // 商品名称（最多100字）

  @Column({ type: 'varchar', length: 50 })
  commodity_price: any; // 商品价格（支持数字和字符串类型）

  @Column({ length: 800 })
  commodity_description: string; // 商品描述（最多800字）

  @Column({ length: 800 })
  service_guarantee: string; // 服务保障（最多800字）

  @Column('simple-json')
  commodity_cover: string[]; // 商品封面（1张 数组类型）

  @Column('simple-json')
  commodity_images: string[]; // 商品主图（最多4张 数组类型）

  @Column('simple-json')
  commodity_details: {
    title?: string;
    desc?: string;
    image: string[];
  }[]; // 商品详情

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
