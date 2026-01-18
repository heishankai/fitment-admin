import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('swiper_config')
export class SwiperConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  swiper_image: string; // 轮播图图片URL

  @Column('varchar', { length: 100, nullable: true })
  title: string; // 标题

  @Column('varchar', { length: 200, nullable: true })
  description: string; // 描述

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
