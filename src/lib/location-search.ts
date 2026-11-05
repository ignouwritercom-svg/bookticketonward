import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import type { LocationKind, LocationOption } from "./location-types";

type Record = LocationOption & { search: string; weight: number; primary: string };
const inflate = promisify(gunzip);
let catalogue: Promise<Record[]> | undefined;

export function foldLocation(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

async function records() {
  if (!catalogue) {
    catalogue = (async () => {
      const compressed = await readFile(path.join(process.cwd(), "src/data/locations.json.gz"));
      const data = JSON.parse((await inflate(compressed)).toString("utf8")) as { version: number; records: Omit<Record, "primary">[] };
      if (data.version !== 1 || !Array.isArray(data.records) || data.records.length < 20000) throw new Error("Location catalogue unavailable");
      return data.records.map(item => ({ ...item, primary: foldLocation(item.value), search: `${item.search} ${foldLocation(item.country)}` }));
    })().catch(error => { catalogue = undefined; throw error; });
  }
  return catalogue;
}

const airportDefaults = ["DEL", "BOM", "DXB", "AUH", "LHR", "CDG", "SIN", "JFK"];
const cityDefaults = ["city:2988507", "city:292223", "city:2643743", "city:1261481", "city:1880252", "city:5128581", "city:1609350", "city:1850147"];

export async function searchLocations(kind: LocationKind, query: string, country?: string): Promise<LocationOption[]> {
  const all = await records();
  const normalized = foldLocation(query);
  const words = normalized.split(" ").filter(Boolean);
  if (normalized.length === 1) return [];
  const countryQuery = foldLocation(country ?? "");
  const selectedCountry = countryQuery ? all.find(item => item.kind === "country" && (item.primary === countryQuery || item.countryCode.toLowerCase() === countryQuery || !countryQuery.includes(" ") && item.search.split(" ").includes(countryQuery)))?.countryCode : undefined;
  const matches: { item: Record; score: number }[] = [];
  for (const item of all) {
    if (item.kind !== kind) continue;
    if (normalized && !words.every(word => item.search.includes(word))) continue;
    let score = item.code?.toLowerCase() === normalized || item.primary === normalized ? 0 : item.primary.startsWith(normalized) ? 1 : item.primary.includes(normalized) ? 2 : 3;
    if (!normalized) {
      const index = kind === "airport" ? airportDefaults.indexOf(item.code ?? "") : kind === "city" ? cityDefaults.indexOf(item.id) : -1;
      score = index >= 0 ? index : 100;
    }
    matches.push({ item, score });
  }
  // A country is a preference, not a hard lock. Returning to a saved stay
  // must still let someone choose a destination in a different country.
  matches.sort((a, b) => a.score - b.score || (kind === "city" && selectedCountry ? Number(b.item.countryCode === selectedCountry) - Number(a.item.countryCode === selectedCountry) : 0) || b.item.weight - a.item.weight || a.item.label.localeCompare(b.item.label, "en") || a.item.id.localeCompare(b.item.id));
  return matches.slice(0, 8).map(({ item }) => ({ id: item.id, kind: item.kind, value: item.value, label: item.label, detail: item.detail, country: item.country, countryCode: item.countryCode, ...(item.code ? { code: item.code } : {}) }));
}
