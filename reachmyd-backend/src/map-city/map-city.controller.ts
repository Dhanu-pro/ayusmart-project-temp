import { Controller, Get } from "@nestjs/common";
import { MapCityService } from "./map-city.service";

@Controller("map")
export class MapCityController {
  constructor(private readonly service: MapCityService) {}

  @Get("cities")
  getCities() {
    return this.service.getAllCities();
  }
}