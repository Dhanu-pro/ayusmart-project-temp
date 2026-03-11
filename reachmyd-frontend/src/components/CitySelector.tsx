"use client";

import { Select } from "@/components/ui/select";

type City = {
  mc_city_id: string;
  mc_city_name: string;
  mc_lat: string;
  mc_lng: string;
};

export default function CitySelector({
  cities,
  onSelect,
}: {
  cities: City[];
  onSelect: (city: City) => void;
}) {
  return (
    <Select
      className="w-64"
      onChange={(e) => {
        const city = cities.find((c) => c.mc_city_name === e.target.value);
        if (city) onSelect(city);
      }}
    >
      <option value="">Select City</option>

      {cities.map((city) => (
        <option
          key={`${city.mc_city_id}-${city.mc_city_name}`}
          value={city.mc_city_name}
        >
          {city.mc_city_name}
        </option>
      ))}
    </Select>
  );
}
