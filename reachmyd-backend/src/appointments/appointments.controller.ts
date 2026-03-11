import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}

  @Get()
  getAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body) {
    return this.service.create({
      ...body,
      request_date: new Date(),
      ar_appt_status: 'Open',
    });
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: number,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(id, status);
  }
}