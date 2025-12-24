import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('independent_page_config')
export class IndependentPageConfig {
  @PrimaryGeneratedColumn()
  id: number;

  //标题
  @Column({
    type: 'varchar',
    length: 10,
    comment: '标题',
  })
  title: string;

  //富文本内容
  @Column({
    type: 'text',
    nullable: true,
    comment: '富文本内容',
  })
  content: string;

  //价格
  @Column({
    type: 'varchar',
    length: 10,
    comment: '价格',
  })
  price: string;

  // // 工价id

  // @Column({
  //   type: 'varchar',

  //   length: 10,

  //   comment: '工价id',
  // })
  // work_price_id: string;

  //创建时间
  @CreateDateColumn()
  createdAt: Date;

  //更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
