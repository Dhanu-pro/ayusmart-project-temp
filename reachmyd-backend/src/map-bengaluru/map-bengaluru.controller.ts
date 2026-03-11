import { Controller, Get } from "@nestjs/common";
import { MapBengaluruService } from "./map-bengaluru.service";

@Controller("map")
export class MapBengaluruController {
  constructor(private readonly mapService: MapBengaluruService) {}

  @Get("bengaluru/markers")
  getMarkers() {
    return this.mapService.getMarkers();
  }
}