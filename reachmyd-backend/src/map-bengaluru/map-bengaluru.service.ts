import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MapDetailsBengaluru } from "./map-bengaluru.entity";

@Injectable()
export class MapBengaluruService {
  constructor(
    @InjectRepository(MapDetailsBengaluru)
    private readonly repo: Repository<MapDetailsBengaluru>,
  ) {}

  async getMarkers() {
    const rows = await this.repo.find({
      take: 1000, // IMPORTANT: do not load all 12k+
    });

    return rows.map((row) => {
      const lat = Number(row.md_l1);
      const lng = Number(row.md_l2);

      return {
        id: row.md_id,
        name: row.md_name,
        icon: row.md_icon,
        url: row.md_url,
        shortName: row.md_short_name,
        photo: {
          src: row.md_photo_src,
          width: row.md_photo_width,
          height: row.md_photo_height,
        },
        address: {
          street: row.md_address_street,
          locality1: row.md_locality1,
          locality2: row.md_locality2,
          city: row.md_address_city,
          state: row.md_address_state,
          country: row.md_address_country,
          zip: row.md_address_zip_code,
        },
        contact: {
          phone: row.md_contact_phone,
          email: row.md_contact_email,
          fax: row.md_contact_fax,
        },
        type: row.md_type,
        speciality: row.md_specialisation,
        googleType: row.md_google_type,
        addedDate: row.md_added_date,
        position: {
          lat: isNaN(lat) ? null : lat,
          lng: isNaN(lng) ? null : lng,
        },
      };
    });
  }
}