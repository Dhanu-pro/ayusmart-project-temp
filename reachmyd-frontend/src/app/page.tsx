"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CITIES } from "@/lib/cities";

const ClinicMap = dynamic(() => import("@/components/ClinicMap.client"), {
  ssr: false,
});

const EXCLUDED_PLACE_TYPES = [
  "hospital",
  "pharmacy",
  "point_of_interest",
  "establishment",
] as const;

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function canonicalLocalityKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupeLocalities(items: string[]): string[] {
  const map = new Map<string, string>();
  for (const item of items) {
    const pretty = toTitleCase(item.trim());
    const key = canonicalLocalityKey(pretty);
    if (!key) {
      continue;
    }

    const existing = map.get(key);
    if (!existing) {
      map.set(key, pretty);
      continue;
    }

    if (pretty.length > existing.length) {
      map.set(key, pretty);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

export default function Home() {
  const [cityKey, setCityKey] = useState<keyof typeof CITIES>("bengaluru");
  const [localities, setLocalities] = useState<string[]>([]);
  const [placeTypes, setPlaceTypes] = useState<string[]>([]);
  const [placeType, setPlaceType] = useState("all");
  const [locality, setLocality] = useState("");
  const [localitySearch, setLocalitySearch] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLoadingLocalities, setIsLoadingLocalities] = useState(true);
  const [isLoadingPlaceTypes, setIsLoadingPlaceTypes] = useState(true);

  const city = CITIES[cityKey];
  const activeCenter: [number, number] = mapCenter ?? [city.lat, city.lng];
  const filteredLocalities = useMemo(() => {
    const query = localitySearch.trim().toLowerCase();
    if (!query) {
      return localities;
    }

    return localities.filter((item) => item.toLowerCase().includes(query));
  }, [localities, localitySearch]);

  const hasNoSearchResults =
    !isLoadingLocalities &&
    localitySearch.trim().length > 0 &&
    filteredLocalities.length === 0;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`http://localhost:3000/map/${cityKey}/localities`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load localities (${res.status})`);
        }
        return res.json();
      })
      .then((data: string[]) => {
        setLocalities(dedupeLocalities(data));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setLocalities([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingLocalities(false);
        }
      });

    return () => controller.abort();
  }, [cityKey]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoadingPlaceTypes(true);

    fetch(`http://localhost:3000/map/${cityKey}/place-types`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load place types (${res.status})`);
        }
        return res.json();
      })
      .then((data: string[]) => {
        const normalized = Array.from(
          new Set(
            data
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean)
              .filter(
                (item) =>
                  !EXCLUDED_PLACE_TYPES.includes(
                    item as (typeof EXCLUDED_PLACE_TYPES)[number],
                  ),
              ),
          ),
        ).sort((a, b) => a.localeCompare(b));

        setPlaceTypes(normalized);
        setPlaceType((current) => {
          if (
            current === "all" ||
            normalized.some((item) => item === current.toLowerCase())
          ) {
            return current;
          }

          return "all";
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setPlaceTypes([]);
        setPlaceType("all");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingPlaceTypes(false);
        }
      });

    return () => controller.abort();
  }, [cityKey]);

  const placeTypeLabel = placeType === "all" ? "places" : toTitleCase(placeType);

  const distanceInKm = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return 2 * 6371 * Math.asin(Math.sqrt(a));
  };

  const pickNearestCity = (
    lat: number,
    lng: number,
  ): { key: keyof typeof CITIES; distanceKm: number } => {
    let nearest = Object.keys(CITIES)[0] as keyof typeof CITIES;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const key of Object.keys(CITIES) as Array<keyof typeof CITIES>) {
      const c = CITIES[key];
      const distance = distanceInKm(lat, lng, c.lat, c.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = key;
      }
    }

    return { key: nearest, distanceKm: bestDistance };
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported in this browser.");
      return;
    }

    setLocationStatus("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nearestCity = pickNearestCity(lat, lng);

        setIsLoadingLocalities(true);
        setLocality("");
        setLocalitySearch("");
        setUserLocation([lat, lng]);
        setMapCenter([lat, lng]);
        setCityKey(nearestCity.key);
        setLocationStatus(
          `Using your location. Fetching nearby hospitals around you (closest city: ${CITIES[nearestCity.key].name}, ${nearestCity.distanceKm.toFixed(1)} km).`,
        );
      },
      (error) => {
        setLocationStatus(`Location access failed: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <Card className="relative z-[9999] m-2 mb-1">
        <CardContent className="space-y-2 p-2.5">
          <div className="grid items-center gap-2 lg:grid-cols-[170px_minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,1fr)_auto_auto_auto]">
            <Select
              className="h-9 !w-[170px]"
              value={cityKey}
              onChange={(e) => {
                setCityKey(e.target.value as keyof typeof CITIES);
                setMapCenter(null);
                setUserLocation(null);
                setIsLoadingLocalities(true);
                setLocality("");
                setLocalitySearch("");
                setPlaceType("all");
                setLocationStatus(null);
              }}
            >
              {Object.entries(CITIES).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input
              className="h-9"
              type="text"
              placeholder="Search locality..."
              value={localitySearch}
              onChange={(e) => setLocalitySearch(e.target.value)}
              disabled={isLoadingLocalities || localities.length === 0}
            />

            <Select
              className="h-9"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              disabled={isLoadingLocalities || localities.length === 0}
            >
              <option value="">
                {isLoadingLocalities
                  ? "Loading localities..."
                  : `All localities (${filteredLocalities.length})`}
              </option>
              {filteredLocalities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            <Select
              className="h-9"
              value={placeType}
              onChange={(e) => setPlaceType(e.target.value)}
              disabled={isLoadingPlaceTypes}
            >
              <option value="all">
                {isLoadingPlaceTypes ? "Loading types..." : "All place types"}
              </option>
              {placeTypes.map((item) => (
                <option key={item} value={item}>
                  {toTitleCase(item)}
                </option>
              ))}
            </Select>

            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setLocality("")}
              disabled={!locality}
            >
              Clear locality
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setLocalitySearch("")}
              disabled={!localitySearch}
            >
              Clear search
            </Button>

            <Button type="button" variant="outline" className="h-9" onClick={useCurrentLocation}>
              Use my location
            </Button>
          </div>

          <div className="text-xs text-slate-600">
            {locality
              ? `Showing ${placeTypeLabel} in ${locality}.`
              : `Showing ${placeTypeLabel} across ${city.name}.`}
          </div>

          {hasNoSearchResults && (
            <Alert className="border-amber-200 bg-amber-50 py-1 text-amber-700">
              <AlertDescription>No locality matches &quot;{localitySearch}&quot;.</AlertDescription>
            </Alert>
          )}

          {locationStatus && (
            <Alert className="border-blue-200 bg-blue-50 py-1 text-blue-700">
              <AlertDescription>{locationStatus}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="min-h-0 flex-1">
        <ClinicMap
          cityKey={cityKey}
          center={activeCenter}
          locality={locality}
          placeType={placeType}
          userLocation={userLocation}
        />
      </div>
    </div>
  );
}
