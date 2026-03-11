import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("map_details_backup")
export class MapEntity {
  @PrimaryColumn()
  md_id: number;

  @Column()
  md_l1: string; // latitude (string in DB)

  @Column()
  md_l2: string; // longitude (string in DB)

  @Column()
  md_name: string;

  @Column()
  md_address_street: string;

  @Column()
  md_type: string;

  @Column()
  md_specialisation: string;

  @Column()
  md_address_city: string;
}