import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('craftsman_query')
export class CraftsmanQuery {
  @PrimaryGeneratedColumn()
  id: number;

  // 工匠名称
  @Column()
  craftsman_name: string;

  // 年龄
  @Column({ type: 'varchar', length: 50 })
  craftsman_age: any;

  // 手机号码
  @Column({ type: 'varchar', length: 50 })
  craftsman_phone: any;

  // 城市名称
  @Column()
  city_name: string;

  // 城市代码
  @Column()
  city_code: string;

  // 技能
  @Column({ type: 'text', nullable: true })
  craftsman_skill: string;

  // 个人简介
  @Column({ type: 'text', nullable: true })
  craftsman_intro: string;

  // 个人荣誉说明
  @Column({ type: 'text', nullable: true })
  craftsman_honor: string;

  // 过往工作说明
  @Column({ type: 'text', nullable: true })
  craftsman_work_intro: string;

  // 形象照
  @Column({ type: 'json', nullable: true })
  craftsman_image: string[];

  // 个人荣誉照片
  @Column({ type: 'json', nullable: true })
  craftsman_honor_images: string[];

  // 技能证书
  @Column({ type: 'json', nullable: true })
  craftsman_skill_certificate: string[];

  // 客户好评说明
  @Column({ type: 'json', nullable: true })
  craftsman_customer_comments: Array<{
    comment_desc: string;
    comment_images: string[];
  }>;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
