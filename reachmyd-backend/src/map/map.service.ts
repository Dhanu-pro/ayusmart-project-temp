import { Injectable, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class MapService {
  constructor(private readonly dataSource: DataSource) {}
  private readonly cityColumnCache = new Map<string, CityColumnConfig>();
  private readonly localitiesCache = new Map<
    string,
    { expiresAt: number; value: string[] }
  >();
  private readonly placeTypesCache = new Map<
    string,
    { expiresAt: number; value: string[] }
  >();
  private readonly markersCache = new Map<
    string,
    { expiresAt: number; value: unknown[] }
  >();
  private readonly cacheTtlMs = 60 * 1000;
  private readonly maxCacheEntries = 40;

  private cityTableMap: Record<string, string> = {
    bengaluru: "map_details_bengaluru",
    chennai: "map_details_chennai",
    hyderabad: "map_details_hyderabad",
    pune: "map_details_pune",
    mumbai: "map_details_mumbai",
  };

  private cityNameMap: Record<string, string> = {
    bengaluru: "Bengaluru",
    chennai: "Chennai",
    hyderabad: "Hyderabad",
    mumbai: "Mumbai",
    pune: "Pune",
  };
  private cityBoundsMap: Record<
    string,
    { latMin: number; latMax: number; lngMin: number; lngMax: number }
  > = {
    bengaluru: { latMin: 12.72, latMax: 13.20, lngMin: 77.35, lngMax: 77.85 },
    chennai: { latMin: 12.80, latMax: 13.30, lngMin: 80.05, lngMax: 80.40 },
    hyderabad: { latMin: 17.20, latMax: 17.65, lngMin: 78.20, lngMax: 78.75 },
    mumbai: { latMin: 18.85, latMax: 19.35, lngMin: 72.70, lngMax: 72.98 },
    pune: { latMin: 18.35, latMax: 18.75, lngMin: 73.65, lngMax: 74.05 },
  };

  private localityBlocklist =
    /\b(road|rd|street|st|lane|ln|cross|main|avenue|ave|signal|block|flr|floor|near|opp|opposite)\b/i;
  private readonly excludedPlaceTypes = new Set([
    "hospital",
    "pharmacy",
    "point_of_interest",
    "establishment",
  ]);

  private getCached<T>(
    cache: Map<string, { expiresAt: number; value: T }>,
    key: string,
  ): T | null {
    const cached = cache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      cache.delete(key);
      return null;
    }

    return cached.value;
  }

  private setCached<T>(
    cache: Map<string, { expiresAt: number; value: T }>,
    key: string,
    value: T,
  ) {
    cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, value });
    if (cache.size <= this.maxCacheEntries) {
      return;
    }

    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  private quoteIdentifier(columnName: string): string {
    return `\`${columnName.replace(/`/g, "``")}\``;
  }

  private async getCityColumnConfig(tableName: string): Promise<CityColumnConfig> {
    const cached = this.cityColumnCache.get(tableName);
    if (cached) {
      return cached;
    }

    const rows: Array<{ Field: string }> = await this.dataSource.query(
      `SHOW COLUMNS FROM ${tableName}`,
    );
    const columns = new Set(rows.map((row) => row.Field.toLowerCase()));
    const pick = (...options: string[]): string | null => {
      for (const option of options) {
        if (columns.has(option.toLowerCase())) {
          return option;
        }
      }
      return null;
    };

    const lat = pick("md_l1", "rmd_l1");
    const lng = pick("md_l2", "rmd_l2");
    if (!lat || !lng) {
      throw new BadRequestException("Map data unavailable for city");
    }

    const config: CityColumnConfig = {
      id: pick("md_id", "rmd_id"),
      name: pick("md_name", "rmd_name"),
      lat,
      lng,
      locality1: pick("md_locality1", "rmd_locality1"),
      locality2: pick("md_locality2", "rmd_locality2"),
      type: pick("md_type", "rmd_type"),
      googleType: pick("md_google_type", "rmd_google_type"),
    };

    this.cityColumnCache.set(tableName, config);
    return config;
  }

  private normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private canonicalLocalityKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private preferReadableLocality(current: string, candidate: string): string {
    const currentHasWordBreak = /\s/.test(current);
    const candidateHasWordBreak = /\s/.test(candidate);

    if (!currentHasWordBreak && candidateHasWordBreak) {
      return candidate;
    }

    if (currentHasWordBreak && !candidateHasWordBreak) {
      return current;
    }

    const currentPunctuation = (current.match(/[.\-/,]/g) ?? []).length;
    const candidatePunctuation = (candidate.match(/[.\-/,]/g) ?? []).length;

    if (candidatePunctuation < currentPunctuation) {
      return candidate;
    }

    if (candidatePunctuation > currentPunctuation) {
      return current;
    }

    return candidate.length > current.length ? candidate : current;
  }

  private cleanLocality(raw: string): string | null {
    let value = this.normalizeWhitespace(raw);
    if (!value) {
      return null;
    }

    if (value.includes(",")) {
      const parts = value
        .split(",")
        .map((part) => this.normalizeWhitespace(part))
        .filter(Boolean);
      value = parts[parts.length - 1] ?? value;
    }

    value = value.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "");
    value = value.replace(/\b\d{6}\b/g, "").trim();
    value = this.normalizeWhitespace(value);

    if (!value || value.length < 3) {
      return null;
    }

    if (/^[0-9\s\-\/]+$/.test(value)) {
      return null;
    }

    if (this.localityBlocklist.test(value)) {
      return null;
    }

    return value;
  }

  private normalizePlaceType(raw: string): string | null {
    const value = this.normalizeWhitespace(raw).toLowerCase();
    if (!value) {
      return null;
    }

    if (this.excludedPlaceTypes.has(value)) {
      return null;
    }

    return value;
  }

  private chooseMarkerLocality(
    locality1?: string | null,
    locality2?: string | null,
    city?: string,
  ): string {
    const candidates = [locality2, locality1]
      .map((value) => (value == null ? null : this.cleanLocality(String(value))))
      .filter((value): value is string => Boolean(value));

    if (candidates.length === 0) {
      return city ? this.cityNameMap[city.toLowerCase()] ?? "Location unavailable" : "Location unavailable";
    }

    let best = candidates[0];
    for (const candidate of candidates.slice(1)) {
      best = this.preferReadableLocality(best, candidate);
    }

    return best;
  }

  private normalizeMarkerName(raw: string | null | undefined): string {
    const value = this.normalizeWhitespace(String(raw ?? ""));
    return value || "Unknown";
  }

  private distanceInKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return 2 * 6371 * Math.asin(Math.sqrt(a));
  }

  private dedupeMarkerRows(
    rows: Array<{
      md_id: number | string | null;
      md_name: string | null;
      md_l1: string | number | null;
      md_l2: string | number | null;
      locality1?: string | null;
      locality2?: string | null;
      locality?: string | null;
    }>,
    city: string,
  ) {
    const exactById = new Map<string, (typeof rows)[number]>();

    for (const row of rows) {
      const idKey = String(row.md_id ?? "").trim();
      if (!idKey) {
        continue;
      }

      const existing = exactById.get(idKey);
      if (!existing) {
        exactById.set(idKey, row);
        continue;
      }

      const currentLocality = this.chooseMarkerLocality(
        existing.locality1,
        existing.locality2,
        city,
      );
      const nextLocality = this.chooseMarkerLocality(row.locality1, row.locality2, city);
      exactById.set(
        idKey,
        this.preferReadableLocality(currentLocality, nextLocality) === nextLocality
          ? row
          : existing,
      );
    }

    const sourceRows = exactById.size > 0 ? Array.from(exactById.values()) : rows;
    const groupedByName = new Map<
      string,
      Array<{
        md_id: number | string | null;
        md_name: string;
        md_l1: string | number | null;
        md_l2: string | number | null;
        locality: string;
      }>
    >();

    for (const row of sourceRows) {
      const lat = Number.parseFloat(String(row.md_l1 ?? ""));
      const lng = Number.parseFloat(String(row.md_l2 ?? ""));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

      const name = this.normalizeMarkerName(row.md_name);
      const locality = this.chooseMarkerLocality(row.locality1, row.locality2, city);
      const nameKey = name.toLowerCase();
      const candidate = {
        md_id: row.md_id,
        md_name: name,
        md_l1: row.md_l1,
        md_l2: row.md_l2,
        locality,
      };

      const existingEntries = groupedByName.get(nameKey) ?? [];
      let merged = false;

      for (let index = 0; index < existingEntries.length; index += 1) {
        const existing = existingEntries[index];
        const existingLat = Number.parseFloat(String(existing.md_l1 ?? ""));
        const existingLng = Number.parseFloat(String(existing.md_l2 ?? ""));
        if (!Number.isFinite(existingLat) || !Number.isFinite(existingLng)) {
          continue;
        }

        const distanceKm = this.distanceInKm(lat, lng, existingLat, existingLng);
        if (distanceKm > 0.08) {
          continue;
        }

        const existingId = Number.parseInt(String(existing.md_id ?? ""), 10);
        const candidateId = Number.parseInt(String(candidate.md_id ?? ""), 10);
        const preferredLocality =
          this.preferReadableLocality(existing.locality, candidate.locality) === candidate.locality
            ? candidate.locality
            : existing.locality;

        existingEntries[index] =
          Number.isFinite(candidateId) &&
          (!Number.isFinite(existingId) || candidateId > existingId)
            ? { ...candidate, locality: preferredLocality }
            : { ...existing, locality: preferredLocality };
        merged = true;
        break;
      }

      if (!merged) {
        existingEntries.push(candidate);
      }

      groupedByName.set(nameKey, existingEntries);
    }

    return Array.from(groupedByName.values()).flat();
  }

  private getTableName(city: string): string {
    const tableName = this.cityTableMap[city.toLowerCase()];

    if (!tableName) {
      throw new BadRequestException("Invalid city");
    }

    return tableName;
  }

  private getCityBounds(city: string) {
    const bounds = this.cityBoundsMap[city.toLowerCase()];
    if (!bounds) {
      throw new BadRequestException("Invalid city");
    }
    return bounds;
  }

  async getLocalitiesByCity(city: string) {
    const cacheKey = city.toLowerCase();
    const cached = this.getCached(this.localitiesCache, cacheKey);
    if (cached) {
      return cached;
    }

    const tableName = this.getTableName(city);
    const cityBounds = this.getCityBounds(city);
    const cityName = this.cityNameMap[city.toLowerCase()];
    const columns = await this.getCityColumnConfig(tableName);

    if (!cityName) {
      throw new BadRequestException("Invalid city");
    }

    const masterQuery = `
      SELECT DISTINCT TRIM(cl_locality2) AS locality
      FROM city_locality_details
      WHERE cl_city = ?
        AND TRIM(cl_locality2) != ''
    `;

    const latCol = this.quoteIdentifier(columns.lat);
    const lngCol = this.quoteIdentifier(columns.lng);
    const localityQueries: string[] = [];

    if (columns.locality2) {
      const locality2Col = this.quoteIdentifier(columns.locality2);
      localityQueries.push(`
        SELECT DISTINCT TRIM(${locality2Col}) AS locality
        FROM ${tableName}
        WHERE ${latCol} IS NOT NULL
          AND ${lngCol} IS NOT NULL
          AND ${latCol} != ''
          AND ${lngCol} != ''
          AND CAST(${latCol} AS DECIMAL(10,6)) BETWEEN ${cityBounds.latMin} AND ${cityBounds.latMax}
          AND CAST(${lngCol} AS DECIMAL(10,6)) BETWEEN ${cityBounds.lngMin} AND ${cityBounds.lngMax}
          AND TRIM(${locality2Col}) != ''
      `);
    }

    if (columns.locality1) {
      const locality1Col = this.quoteIdentifier(columns.locality1);
      localityQueries.push(`
        SELECT DISTINCT TRIM(${locality1Col}) AS locality
        FROM ${tableName}
        WHERE ${latCol} IS NOT NULL
          AND ${lngCol} IS NOT NULL
          AND ${latCol} != ''
          AND ${lngCol} != ''
          AND CAST(${latCol} AS DECIMAL(10,6)) BETWEEN ${cityBounds.latMin} AND ${cityBounds.latMax}
          AND CAST(${lngCol} AS DECIMAL(10,6)) BETWEEN ${cityBounds.lngMin} AND ${cityBounds.lngMax}
          AND TRIM(${locality1Col}) != ''
      `);
    }

    const masterRows: Array<{ locality: string }> = await this.dataSource.query(masterQuery, [
      cityName,
    ]);
    const mapRows: Array<{ locality: string }> =
      localityQueries.length > 0
        ? await this.dataSource.query(localityQueries.join("\nUNION\n"))
        : [];

    const merged = [...masterRows, ...mapRows]
      .map((row) => this.cleanLocality(row.locality))
      .filter((value): value is string => Boolean(value));

    const uniqueByCanonical = new Map<string, string>();
    for (const loc of merged) {
      const key = this.canonicalLocalityKey(loc);
      if (!key) {
        continue;
      }

      const existing = uniqueByCanonical.get(key);
      if (!existing) {
        uniqueByCanonical.set(key, loc);
        continue;
      }

      uniqueByCanonical.set(key, this.preferReadableLocality(existing, loc));
    }

    const result = Array.from(uniqueByCanonical.values()).sort((a, b) =>
      a.localeCompare(b),
    );

    this.setCached(this.localitiesCache, cacheKey, result);
    return result;
  }

  async getMarkersByCity(
    city: string,
    limit?: string,
    locality?: string,
    placeType?: string,
    lat?: string,
    lng?: string,
    radiusKm?: string,
  ) {
    const cacheKey = [
      city.toLowerCase(),
      limit ?? "",
      locality?.trim().toLowerCase() ?? "",
      placeType?.trim().toLowerCase() ?? "",
      lat ?? "",
      lng ?? "",
      radiusKm ?? "",
    ].join("|");
    const cached = this.getCached(this.markersCache, cacheKey);
    if (cached) {
      return cached;
    }

    const tableName = this.getTableName(city);
    const cityBounds = this.getCityBounds(city);
    const columns = await this.getCityColumnConfig(tableName);
    const latCol = this.quoteIdentifier(columns.lat);
    const lngCol = this.quoteIdentifier(columns.lng);
    const idSelect = columns.id
      ? `${this.quoteIdentifier(columns.id)} AS md_id`
      : `NULL AS md_id`;
    const nameSelect = columns.name
      ? `${this.quoteIdentifier(columns.name)} AS md_name`
      : `'Unknown' AS md_name`;

    const locality1Select = columns.locality1
      ? `${this.quoteIdentifier(columns.locality1)} AS locality1`
      : `NULL AS locality1`;
    const locality2Select = columns.locality2
      ? `${this.quoteIdentifier(columns.locality2)} AS locality2`
      : `NULL AS locality2`;

    const parsedLimit = Number.parseInt(limit ?? "3000", 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 100), 5000)
      : 3000;

    let query = `
      SELECT
        ${idSelect},
        ${nameSelect},
        ${latCol} AS md_l1,
        ${lngCol} AS md_l2,
        ${locality1Select},
        ${locality2Select}
      FROM ${tableName}
      WHERE
        ${latCol} IS NOT NULL
        AND ${lngCol} IS NOT NULL
        AND ${latCol} != ''
        AND ${lngCol} != ''
        AND CAST(${latCol} AS DECIMAL(10,6)) BETWEEN ? AND ?
        AND CAST(${lngCol} AS DECIMAL(10,6)) BETWEEN ? AND ?
    `;

    const params: Array<string | number> = [
      cityBounds.latMin,
      cityBounds.latMax,
      cityBounds.lngMin,
      cityBounds.lngMax,
    ];
    const cleanedLocality = locality?.trim();
    const cleanedPlaceType = placeType?.trim();
    const parsedLat = Number.parseFloat(lat ?? "");
    const parsedLng = Number.parseFloat(lng ?? "");
    const hasUserLocation = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

    if (hasUserLocation) {
      const parsedRadius = Number.parseFloat(radiusKm ?? "1");
      const safeRadiusKm = Number.isFinite(parsedRadius)
        ? Math.min(Math.max(parsedRadius, 1), 100)
        : 1;
      const latDelta = safeRadiusKm / 111;
      const lngDenominator = Math.max(0.2, Math.cos((parsedLat * Math.PI) / 180));
      const lngDelta = safeRadiusKm / (111 * lngDenominator);
      const numericLatCol = `CAST(${latCol} AS DECIMAL(10,6))`;
      const numericLngCol = `CAST(${lngCol} AS DECIMAL(10,6))`;

      query += `
        AND ${numericLatCol} BETWEEN ? AND ?
        AND ${numericLngCol} BETWEEN ? AND ?
      `;
      params.push(
        parsedLat - latDelta,
        parsedLat + latDelta,
        parsedLng - lngDelta,
        parsedLng + lngDelta,
      );
    }

    const localityColumns = [columns.locality1, columns.locality2].filter(
      (value): value is string => Boolean(value),
    );

    if (cleanedLocality && localityColumns.length > 0) {
      const localityClauses = localityColumns.map(
        (column) =>
          `LOWER(TRIM(${this.quoteIdentifier(column)})) LIKE CONCAT('%', LOWER(TRIM(?)), '%')`,
      );
      query += `
        AND (${localityClauses.join(" OR ")})
      `;
      for (let i = 0; i < localityColumns.length; i += 1) {
        params.push(cleanedLocality);
      }
    }

    const typeColumns = [columns.type, columns.googleType].filter(
      (value): value is string => Boolean(value),
    );

    if (cleanedPlaceType && cleanedPlaceType.toLowerCase() !== "all" && typeColumns.length > 0) {
      const typeClauses = typeColumns.map(
        (column) =>
          `LOWER(TRIM(${this.quoteIdentifier(column)})) LIKE CONCAT('%', LOWER(TRIM(?)), '%')`,
      );
      query += `
        AND (${typeClauses.join(" OR ")})
      `;
      for (let i = 0; i < typeColumns.length; i += 1) {
        params.push(cleanedPlaceType);
      }
    }

    if (hasUserLocation) {
      const numericLatCol = `CAST(${latCol} AS DECIMAL(10,6))`;
      const numericLngCol = `CAST(${lngCol} AS DECIMAL(10,6))`;
      query += `
        ORDER BY
          POW(${numericLatCol} - ?, 2) + POW(${numericLngCol} - ?, 2) ASC,
          md_id DESC
        LIMIT ?
      `;
      params.push(parsedLat, parsedLng);
    } else {
      query += `
        ORDER BY md_id DESC
        LIMIT ?
      `;
    }
    params.push(safeLimit);

    const rows = await this.dataSource.query(query, params);
    const result = this.dedupeMarkerRows(rows, city);
    this.setCached(this.markersCache, cacheKey, result);
    return result;
  }

  async getPlaceTypesByCity(city: string) {
    const cacheKey = city.toLowerCase();
    const cached = this.getCached(this.placeTypesCache, cacheKey);
    if (cached) {
      return cached;
    }

    const tableName = this.getTableName(city);
    const columns = await this.getCityColumnConfig(tableName);
    const primaryTypeColumn = columns.type;
    const fallbackTypeColumn = columns.googleType;

    if (!primaryTypeColumn && !fallbackTypeColumn) {
      return [];
    }

    const runTypeQuery = async (column: string) => {
      const rows: Array<{ placeType: string }> = await this.dataSource.query(`
        SELECT DISTINCT TRIM(${this.quoteIdentifier(column)}) AS placeType
        FROM ${tableName}
        WHERE ${this.quoteIdentifier(column)} IS NOT NULL
          AND TRIM(${this.quoteIdentifier(column)}) != ''
      `);

      return Array.from(
        new Set(
          rows
            .map((row) => this.normalizePlaceType(row.placeType))
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b));
    };

    let normalized: string[] = [];

    if (primaryTypeColumn) {
      normalized = await runTypeQuery(primaryTypeColumn);
    }

    if (normalized.length === 0 && fallbackTypeColumn) {
      normalized = await runTypeQuery(fallbackTypeColumn);
    }

    this.setCached(this.placeTypesCache, cacheKey, normalized);
    return normalized;
  }
}

type CityColumnConfig = {
  id: string | null;
  name: string | null;
  lat: string;
  lng: string;
  locality1: string | null;
  locality2: string | null;
  type: string | null;
  googleType: string | null;
};
