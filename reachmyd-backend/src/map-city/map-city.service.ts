import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MapCity } from "./map-city.entity";

@Injectable()
export class MapCityService {
  constructor(
    @InjectRepository(MapCity)
    private readonly repo: Repository<MapCity>,
  ) {}

  async getAllCities() {
    const cities = await this.repo.find();

    return cities.map((c) => ({
      id: c.mc_city_id,
      name: c.mc_city_name,
      center: {
        lat: Number(c.mc_lat),
        lng: Number(c.mc_lng),
      },
    }));
  }
}