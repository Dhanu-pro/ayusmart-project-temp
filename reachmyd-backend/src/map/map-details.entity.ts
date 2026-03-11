import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("map_details_backup")
export class MapDetails {
  @PrimaryColumn()
  md_id: number;

  // latitude
  @Column({ type: "varchar", length: 20 })
  md_l1: string;

  // longitude
  @Column({ type: "varchar", length: 20 })
  md_l2: string;

  @Column()
  md_name: string;

  @Column()
  md_address_street: string;

  @Column()
  md_locality1: string;

  @Column()
  md_address_city: string;

  @Column()
  md_contact_phone: string;

  @Column()
  md_type: string;

  @Column()
  md_specialisation: string;
}