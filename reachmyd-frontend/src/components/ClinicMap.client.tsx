"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type MarkerType = {
  key: string;
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  locality: string;
};
type ClusterNode = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  items: MarkerType[];
};

type MarkerApiItem = {
  rmd_l1?: string | number | null;
  md_l1?: string | number | null;
  rmd_l2?: string | number | null;
  md_l2?: string | number | null;
  md_id?: string | number | null;
  rmd_id?: string | number | null;
  md_name?: string | null;
  locality?: string | null;
};

const CITY_MARKER_LIMIT = 5000;
const LOCALITY_MARKER_LIMIT = 5000;
const NEARBY_MARKER_LIMIT = 1000;
const INITIAL_LIST_RENDER = 220;
const LIST_RENDER_CHUNK = 180;

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function dedupeMarkers(items: MarkerType[]): MarkerType[] {
  const seen = new Set<string>();
  const unique: MarkerType[] = [];

  for (const item of items) {
    const fingerprint = [
      item.name.trim().toLowerCase(),
      item.locality.trim().toLowerCase(),
      item.lat.toFixed(5),
      item.lng.toFixed(5),
    ].join("|");

    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(item);
  }

  return unique;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 32 : count < 100 ? 38 : 44;
  return L.divIcon({
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      background:rgba(14,116,144,0.9);
      border:2px solid #fff;
      box-shadow:0 1px 8px rgba(0,0,0,.25);
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      font-weight:700;
    ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function numberedMarkerIcon(number: number): L.DivIcon {
  const size = number > 999 ? 34 : number > 99 ? 32 : 30;
  return L.divIcon({
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      background:#0284c7;
      border:2px solid #ffffff;
      color:#ffffff;
      box-shadow:0 1px 6px rgba(0,0,0,.35);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:700;
      line-height:1;
    ">${number}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildClusters(markers: MarkerType[], map: L.Map, zoom: number): ClusterNode[] {
  if (zoom >= 16) {
    return markers.map((m) => ({
      key: m.key,
      lat: m.lat,
      lng: m.lng,
      count: 1,
      items: [m],
    }));
  }

  const cellSize = zoom >= 14 ? 42 : zoom >= 12 ? 54 : 68;
  const buckets = new Map<
    string,
    { latSum: number; lngSum: number; count: number; items: MarkerType[] }
  >();

  for (const marker of markers) {
    const point = map.project([marker.lat, marker.lng], zoom);
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        latSum: marker.lat,
        lngSum: marker.lng,
        count: 1,
        items: [marker],
      });
      continue;
    }
    existing.latSum += marker.lat;
    existing.lngSum += marker.lng;
    existing.count += 1;
    existing.items.push(marker);
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => ({
    key,
    lat: bucket.latSum / bucket.count,
    lng: bucket.lngSum / bucket.count,
    count: bucket.count,
    items: bucket.items,
  }));
}

function ClusteredMarkers({
  markers,
  markerNumberByKey,
}: {
  markers: MarkerType[];
  markerNumberByKey: Map<string, number>;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const clusters = useMemo(() => buildClusters(markers, map, zoom), [markers, map, zoom]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.count === 1) {
          const marker = cluster.items[0];
          const markerNo = markerNumberByKey.get(marker.key) ?? 0;
          return (
            <Marker
              key={marker.key}
              position={[marker.lat, marker.lng]}
              icon={numberedMarkerIcon(markerNo)}
            >
              <Popup>
                #{markerNo} <b>{marker.name}</b>
                <br />
                {marker.locality}
              </Popup>
            </Marker>
          );
        }

        return (
          <Marker
            key={`cluster-${cluster.key}`}
            position={[cluster.lat, cluster.lng]}
            icon={clusterIcon(cluster.count)}
            eventHandlers={{
              click: () => {
                map.setView([cluster.lat, cluster.lng], Math.min(zoom + 2, 18), {
                  animate: true,
                });
              },
            }}
          >
            <Popup>{cluster.count} hospitals in this area</Popup>
          </Marker>
        );
      })}
    </>
  );
}

function FitToMarkers({
  markers,
  userLocation,
  fallbackCenter,
}: {
  markers: MarkerType[];
  userLocation?: [number, number] | null;
  fallbackCenter: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = markers.map((m) => [m.lat, m.lng]);
    if (userLocation) {
      points.push(userLocation);
    }

    if (points.length === 0) {
      map.setView(fallbackCenter, 12, { animate: true });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      animate: true,
      padding: [28, 28],
    });
  }, [fallbackCenter, map, markers, userLocation]);

  return null;
}

function FocusMarker({ marker }: { marker: MarkerType | null }) {
  const map = useMap();

  useEffect(() => {
    if (!marker) return;
    map.setView([marker.lat, marker.lng], Math.max(map.getZoom(), 16), {
      animate: true,
    });
  }, [map, marker]);

  return null;
}

export default function ClinicMap({
  cityKey,
  center,
  locality,
  placeType,
  userLocation,
}: {
  cityKey: string;
  center: [number, number];
  locality?: string;
  placeType?: string;
  userLocation?: [number, number] | null;
}) {
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [focusedMarkerKey, setFocusedMarkerKey] = useState<string | null>(null);
  const [visibleListCount, setVisibleListCount] = useState(INITIAL_LIST_RENDER);
  const deferredHospitalSearch = useDeferredValue(hospitalSearch);
  const hospitalList = useMemo(
    () => [...markers].sort((a, b) => a.name.localeCompare(b.name)),
    [markers],
  );
  const filteredHospitalList = useMemo(() => {
    const query = deferredHospitalSearch.trim().toLowerCase();
    if (!query) return hospitalList;
    return hospitalList.filter((hospital) =>
      `${hospital.name} ${hospital.locality}`.toLowerCase().includes(query),
    );
  }, [deferredHospitalSearch, hospitalList]);

  const visibleHospitalList = useMemo(
    () => filteredHospitalList.slice(0, visibleListCount),
    [filteredHospitalList, visibleListCount],
  );

  const markerNumberByKey = useMemo(() => {
    const map = new Map<string, number>();
    hospitalList.forEach((hospital, index) => map.set(hospital.key, index + 1));
    return map;
  }, [hospitalList]);

  const effectiveFocusedMarkerKey =
    hospitalSearch.trim().length > 0
      ? (filteredHospitalList[0]?.key ?? null)
      : focusedMarkerKey;

  const focusedMarker = useMemo(
    () =>
      effectiveFocusedMarkerKey
        ? markers.find((marker) => marker.key === effectiveFocusedMarkerKey) ?? null
        : null,
    [effectiveFocusedMarkerKey, markers],
  );

  useEffect(() => {
    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const markerLimit = userLocation
      ? NEARBY_MARKER_LIMIT
      : locality
        ? LOCALITY_MARKER_LIMIT
        : CITY_MARKER_LIMIT;
    const params = new URLSearchParams({ limit: String(markerLimit) });
    if (locality) {
      params.set("locality", locality);
    }
    if (placeType && placeType !== "all") {
      params.set("placeType", placeType);
    }
    if (userLocation) {
      params.set("lat", String(userLocation[0]));
      params.set("lng", String(userLocation[1]));
      params.set("radiusKm", "1");
    }

    fetch(`http://localhost:3000/map/${cityKey}/markers?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load markers (${res.status})`);
        }
        return res.json();
      })
      .then((data: MarkerApiItem[]) => {
        const parsed: MarkerType[] = data
          .map((m, index) => {
            const latRaw = m.rmd_l1 ?? m.md_l1;
            const lngRaw = m.rmd_l2 ?? m.md_l2;

            const lat = parseFloat(String(latRaw).trim());
            const lng = parseFloat(String(lngRaw).trim());
            const rawId = m.md_id ?? m.rmd_id ?? "marker";

            return {
              key: `${rawId}-${lat}-${lng}-${index}`,
              id: rawId,
              name: toTitleCase(String(m.md_name ?? "Unknown")),
              lat,
              lng,
              locality: locality
                ? toTitleCase(locality)
                : toTitleCase(String(m.locality ?? "Location unavailable")),
            };
          })
          .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

        const uniqueMarkers = dedupeMarkers(parsed);
        setMarkers(uniqueMarkers);
        setFocusedMarkerKey(null);
        setVisibleListCount(INITIAL_LIST_RENDER);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setMarkers([]);
        setError(err instanceof Error ? err.message : "Failed to load markers");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [cityKey, locality, placeType, userLocation]);

  const placeLabel = placeType && placeType !== "all" ? toTitleCase(placeType) : "Places";

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative h-[62vh] min-h-[360px] md:h-full">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <RecenterMap center={center} />
          <FitToMarkers
            markers={markers}
            userLocation={userLocation}
            fallbackCenter={center}
          />
          <FocusMarker marker={focusedMarker} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {userLocation && (
            <Marker position={userLocation}>
              <Popup>Your current location</Popup>
            </Marker>
          )}

          <ClusteredMarkers
            markers={markers}
            markerNumberByKey={markerNumberByKey}
          />
        </MapContainer>

        {isLoading && (
          <Alert className="absolute right-4 top-4 w-auto border-slate-200 bg-white/95 px-3 py-2 shadow">
            <AlertDescription>
              Loading {toTitleCase(cityKey)}
              {locality ? ` / ${toTitleCase(locality)}` : ""} markers...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="absolute bottom-4 left-4 w-auto border-red-200 bg-red-50 px-3 py-2 text-red-700 shadow">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <aside className="flex h-[38vh] min-h-0 flex-col border-l bg-white p-2 md:h-full">
        <Card className="sticky top-0 rounded-lg border-b">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm font-semibold">
              {locality
                ? `${placeLabel} in ${toTitleCase(locality)}`
                : `${placeLabel} in ${toTitleCase(cityKey)}`}
            </CardTitle>
            <Badge variant="secondary" className="w-fit">
              {filteredHospitalList.length} results
            </Badge>
            <Input
              className="mt-2 h-8"
              value={hospitalSearch}
              onChange={(event) => {
                setHospitalSearch(event.target.value);
                setVisibleListCount(INITIAL_LIST_RENDER);
              }}
              placeholder={`Search ${placeLabel.toLowerCase()}...`}
            />
          </CardHeader>
        </Card>
        <ul
          className="flex-1 space-y-1 overflow-y-auto pt-2 pr-1"
          onScroll={(event) => {
            const target = event.currentTarget;
            const isNearBottom =
              target.scrollTop + target.clientHeight >= target.scrollHeight - 120;
            if (!isNearBottom) return;

            setVisibleListCount((prev) =>
              Math.min(prev + LIST_RENDER_CHUNK, filteredHospitalList.length),
            );
          }}
        >
          {visibleHospitalList.map((hospital) => (
            <Card
              key={hospital.key}
              className={cn(
                "cursor-pointer rounded-lg",
                effectiveFocusedMarkerKey === hospital.key ? "ring-2 ring-sky-400" : "",
              )}
              onClick={() => setFocusedMarkerKey(hospital.key)}
            >
              <CardContent className="px-3 py-2">
                <div className="text-sm font-medium">
                  #{markerNumberByKey.get(hospital.key) ?? "-"} {hospital.name}
                </div>
                <div className="text-xs text-slate-600">{hospital.locality}</div>
              </CardContent>
            </Card>
          ))}
          {visibleHospitalList.length < filteredHospitalList.length ? (
            <li className="py-2 text-center text-xs text-slate-500">
              Scroll for more...
            </li>
          ) : null}
        </ul>
      </aside>
    </div>
  );
}
