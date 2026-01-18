import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('welcome')
export class Welcome {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  logo: string; // Logo图片URL

  @Column('text')
  background_image: string; // 背景图片URL

  @Column('varchar', { length: 200 })
  title: string; // 标题

  @Column('varchar', { length: 500, nullable: true })
  subtitle: string; // 副标题

  @Column('int')
  count_down: number; // 倒计时（数字类型）

  @Column('varchar', { length: 200, nullable: true })
  copyright: string; // 版权信息

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
