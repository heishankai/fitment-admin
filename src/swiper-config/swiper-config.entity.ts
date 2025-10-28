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

  @Column('simple-json')
  swiper_image: string[]; // 轮播图图片数组

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
