import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

// 定义用户实体，映射到数据库中的用户表
@Entity('admin_user')
export class User {
  // 用户ID，主键，自增
  @PrimaryGeneratedColumn() // 主键，自动生成
  id: number;

  // 用户名
  @Column() // 普通列
  @Unique(['username']) // 确保用户名唯一
  username: string;

  // 密码
  @Column()
  password: string;

  // 角色
  @Column()
  role: string;

  // 用户账号，是否启用
  @Column({ type: 'boolean', default: true })
  active: boolean;

  // 头像
  @Column()
  avatar: string;
}
