import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('appointment_requests')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  request_date: Date;

  @Column()
  rmd_user_id: string;

  @Column()
  name: string;

  @Column()
  mobile: string;

  @Column()
  appt_date: Date;

  @Column()
  appt_time: string;

  @Column()
  map_data_id: number;

  @Column()
  notes: string;

  @Column()
  appt_from: string;

  @Column()
  ar_appt_status: string;
}