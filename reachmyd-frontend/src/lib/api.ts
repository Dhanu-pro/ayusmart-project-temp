const BASE_URL = "http://localhost:3000";

export async function fetchCities() {
  const res = await fetch(`${BASE_URL}/map/cities`, {
    cache: "no-store",
  });
  return res.json();
}

export async function fetchMarkers(city: string) {
  const res = await fetch(`${BASE_URL}/map/${city}/markers`, {
    cache: "no-store",
  });
  return res.json();
}