import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('category_config')
export class CategoryConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  category_name: string; // 类目名称

  @Column()
  category_image: string; // 类目图片

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
