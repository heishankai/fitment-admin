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
  work_kind_name: string; // 工种名称

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

