import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('activity')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 200 })
  title: string; // 标题

  @Column('text')
  description: string; // 描述

  @Column('text')
  image: string; // 图片URL

  @Column('varchar', { length: 100 })
  linkText: string; // 链接文本

  @Column('text')
  linkUrl: string; // 链接URL

  @Column('int', { default: 0 })
  sortOrder: number; // 排序字段，数字越小越靠前

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
