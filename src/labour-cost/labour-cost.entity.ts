import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('labour_cost')
export class LabourCost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  labour_cost_name: string; // 人工成本名称

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

