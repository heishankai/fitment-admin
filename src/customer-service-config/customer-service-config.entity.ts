import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_service_config')
export class CustomerServiceConfig {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text', nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  welcome_text: string;

  @Column({ type: 'text', nullable: true })
  welcome_image: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
