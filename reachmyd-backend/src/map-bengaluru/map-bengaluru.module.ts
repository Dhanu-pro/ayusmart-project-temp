import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MapDetailsBengaluru } from "./map-bengaluru.entity";
import { MapBengaluruService } from "./map-bengaluru.service";
import { MapBengaluruController } from "./map-bengaluru.controller";

@Module({
  imports: [TypeOrmModule.forFeature([MapDetailsBengaluru])],
  controllers: [MapBengaluruController],
  providers: [MapBengaluruService],
})
export class MapBengaluruModule {}