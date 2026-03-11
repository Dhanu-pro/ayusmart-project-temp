import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_data')
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column()
  user_name: string;

  @Column()
  user_mobileno: string;

  @Column()
  user_status: string;
}