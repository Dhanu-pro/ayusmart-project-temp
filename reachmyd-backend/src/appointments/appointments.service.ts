import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
  ) {}

  findAll() {
    return this.repo.find({ order: { id: 'DESC' } });
  }

  create(data: Partial<Appointment>) {
    return this.repo.save(data);
  }

  updateStatus(id: number, status: string) {
    return this.repo.update(id, { ar_appt_status: status });
  }
}