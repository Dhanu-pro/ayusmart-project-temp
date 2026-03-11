import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("map_city")
export class MapCity {
  @PrimaryGeneratedColumn()
  mc_id: number;

  @Column()
  mc_city_id: string;

  @Column()
  mc_city_name: string;

  @Column()
  mc_lat: string;

  @Column()
  mc_lng: string;
}