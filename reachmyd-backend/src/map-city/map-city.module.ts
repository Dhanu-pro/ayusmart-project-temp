import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MapCity } from "./map-city.entity";
import { MapCityService } from "./map-city.service";
import { MapCityController } from "./map-city.controller";

@Module({
  imports: [TypeOrmModule.forFeature([MapCity])],
  controllers: [MapCityController],
  providers: [MapCityService],
})
export class MapCityModule {}