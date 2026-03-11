import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("map_details_bengaluru")
export class MapDetailsBengaluru {
  @PrimaryColumn()
  md_id: number;

  // latitude
  @Column({ type: "varchar", length: 20 })
  md_l1: string;

  // longitude
  @Column({ type: "varchar", length: 20 })
  md_l2: string;

  @Column("text")
  md_json: string;

  @Column({ length: 200 })
  md_name: string;

  @Column({ length: 250 })
  md_icon: string;

  @Column({ length: 250 })
  md_url: string;

  @Column({ length: 50 })
  md_short_name: string;

  @Column({ length: 10 })
  md_photo_height: string;

  @Column({ length: 10 })
  md_photo_width: string;

  @Column({ length: 250 })
  md_photo_src: string;

  @Column({ length: 300 })
  md_address_street: string;

  @Column({ length: 300 })
  md_locality1: string;

  @Column({ length: 300 })
  md_locality2: string;

  @Column({ length: 150 })
  md_address_city: string;

  @Column({ length: 150 })
  md_address_state: string;

  @Column({ length: 150 })
  md_address_country: string;

  @Column()
  md_address_zip_code: number;

  @Column({ length: 50 })
  md_contact_email: string;

  @Column({ length: 15 })
  md_contact_phone: string;

  @Column({ length: 15 })
  md_contact_fax: string;

  @Column()
  md_edited: number;

  @Column({ length: 100 })
  md_type: string;

  @Column({ length: 200 })
  md_specialisation: string;

  @Column({ length: 250 })
  md_google_type: string;

  @Column({ type: "date" })
  md_added_date: Date;

  @Column()
  md_map_inst_id: number;

  @Column()
  md_doc_id: number;
}