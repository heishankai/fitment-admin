import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 学生实体
 * 对应 student 表
 */
@Entity('student')
export class Student {
  // 主键ID
  @PrimaryGeneratedColumn()
  id: number;

  // 学生姓名
  @Column({ type: 'varchar', length: 64 })
  name: string;

  // 学生年龄
  @Column({ type: 'int' })
  age: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
