import { Controller, Get, Param, Query } from "@nestjs/common";
import { MapService } from "./map.service";

@Controller("map")
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get(":city/markers")
  async getMarkers(
    @Param("city") city: string,
    @Query("limit") limit?: string,
    @Query("locality") locality?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radiusKm") radiusKm?: string,
  ) {
    return this.mapService.getMarkersByCity(city, limit, locality, lat, lng, radiusKm);
  }

  @Get(":city/localities")
  async getLocalities(@Param("city") city: string) {
    return this.mapService.getLocalitiesByCity(city);
  }
}
