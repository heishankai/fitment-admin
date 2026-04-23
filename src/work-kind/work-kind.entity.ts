import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('work_kind')
export class WorkKind {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  work_kind_code: string; // 工种编码

  @Column()
  work_kind_name: string; // 工种名称

  @Column('int', { default: 0 })
  sortOrder: number; // 排序字段，数字越小越靠前

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

