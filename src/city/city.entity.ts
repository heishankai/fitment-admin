import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('city')
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  city_name: string;

  @Column()
  city_code: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
