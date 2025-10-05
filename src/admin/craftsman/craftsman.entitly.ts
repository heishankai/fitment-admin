import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('admin_craftsman')
export class Craftsman {
  @PrimaryGeneratedColumn()
  id: number;

  // 工匠姓名
  @Column()
  craftsman_name: string;

  // 工匠性别
  @Column()
  craftsman_gender: string;

  // 工匠年龄
  @Column()
  craftsman_age: number;

  // 工匠电话
  @Column()
  craftsman_phone: string;

  // 工匠头像
  @Column()
  craftsman_avatar: string;

  // 工匠介绍
  @Column()
  craftsman_intro: string;

  // 工匠技能
  @Column('json')
  craftsman_skills: string[];

  // 工匠地址
  @Column()
  craftsman_address: string;

  // 工匠注册时间
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  craftsman_register_time: Date;
}
