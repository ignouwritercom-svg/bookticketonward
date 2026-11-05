"""Refresh the public reference catalogue. Python standard library only.

Not part of npm build/runtime: deployed lookups read the committed snapshot.
OurAirports: Public Domain. GeoNames: CC BY 4.0. See src/data/LOCATIONS.md.
"""
import csv
import gzip
import hashlib
import io
import json
from pathlib import Path
import unicodedata
from urllib.request import Request, urlopen
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "src" / "data"
SOURCES = {
    "airports": "https://davidmegginson.github.io/ourairports-data/airports.csv",
    "countries": "https://davidmegginson.github.io/ourairports-data/countries.csv",
    "cities": "https://download.geonames.org/export/dump/cities15000.zip",
    "regions": "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
    "countryInfo": "https://download.geonames.org/export/dump/countryInfo.txt",
}


def fold(text):
    value = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return " ".join("".join(c.lower() if c.isalnum() else " " for c in value).split())


def download(url):
    request = Request(url, headers={"User-Agent": "DummyTicket-location-catalog/1.0"})
    with urlopen(request, timeout=60) as response:
        data = response.read(40_000_001)
    if len(data) > 40_000_000:
        raise ValueError("Source exceeded import limit")
    return data


def main():
    data = {name: download(url) for name, url in SOURCES.items()}
    countries = {row["code"]: row for row in csv.DictReader(io.StringIO(data["countries"].decode("utf-8-sig")))}
    country_aliases = {}
    for line in data["countryInfo"].decode("utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        row = line.split("\t")
        country_aliases[row[0]] = [row[1], row[4]]
    regions = {}
    for line in data["regions"].decode("utf-8").splitlines():
        row = line.split("\t")
        if len(row) >= 3:
            regions[row[0]] = row[2]

    with zipfile.ZipFile(io.BytesIO(data["cities"])) as archive:
        info = archive.getinfo("cities15000.txt")
        if info.file_size > 80_000_000:
            raise ValueError("City source exceeded import limit")
        city_rows = [row.split("\t") for row in archive.read(info).decode("utf-8").splitlines()]

    records = []
    city_aliases = {}
    for row in city_rows:
        if len(row) < 19 or row[8] not in countries or row[7] == "PPLX":
            continue
        city, code = row[1], row[8]
        country = countries[code]["name"]
        region = regions.get(f"{code}.{row[10]}", "")
        aliases = fold(" ".join([row[1], row[2], row[3]]))
        for name in [row[1], row[2]]:
            city_aliases[(code, fold(name))] = aliases
        records.append({"id": f"city:{row[0]}", "kind": "city", "value": city[:100], "label": city,
                        "detail": " · ".join(filter(None, [region, country])), "country": country,
                        "countryCode": code, "search": aliases, "weight": int(row[14] or 0)})

    airport_codes = set()
    for row in csv.DictReader(io.StringIO(data["airports"].decode("utf-8-sig"))):
        iata, code = row["iata_code"], row["iso_country"]
        if len(iata) != 3 or not iata.isalpha() or code not in countries or row["type"] not in {"large_airport", "medium_airport", "small_airport"}:
            continue
        if row["type"] == "small_airport" and row["scheduled_service"] != "yes":
            continue
        if iata in airport_codes:
            continue
        airport_codes.add(iata)
        city = row["municipality"] or row["name"]
        country = countries[code]["name"]
        label = f"{city[:94].rstrip()} ({iata})"
        aliases = city_aliases.get((code, fold(city)), "")
        records.append({"id": f"airport:{row['id']}", "kind": "airport", "value": label, "label": label,
                        "detail": f"{row['name']} · {country}", "country": country, "countryCode": code, "code": iata,
                        "search": fold(" ".join([iata, row["name"], city, row["keywords"], aliases])),
                        "weight": {"large_airport": 3, "medium_airport": 2, "small_airport": 1}[row["type"]]})

    for code, row in countries.items():
        extras = {"GB": "UK United Kingdom Britain", "US": "USA United States America", "AE": "UAE United Arab Emirates"}.get(code, "")
        records.append({"id": f"country:{code}", "kind": "country", "value": row["name"], "label": row["name"],
                        "detail": code, "country": row["name"], "countryCode": code, "code": code,
                        "search": fold(" ".join([code, row["name"], row.get("keywords", ""), *country_aliases.get(code, []), extras])), "weight": 0})

    counts = {kind: sum(row["kind"] == kind for row in records) for kind in ["airport", "city", "country"]}
    if counts["airport"] < 3000 or counts["city"] < 20000 or counts["country"] < 240:
        raise ValueError("Incomplete catalogue; existing snapshot was not replaced")
    if not {"DEL", "DXB", "LHR", "CDG", "JFK"}.issubset(airport_codes):
        raise ValueError("Missing reference airports")
    if len({row["id"] for row in records}) != len(records):
        raise ValueError("Duplicate location IDs")
    payload = json.dumps({"version": 1, "records": records}, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(payload, mtime=0)
    manifest = {"version": 1, "generatedAt": datetime.now(timezone.utc).isoformat(), "counts": counts,
                "snapshotSha256": hashlib.sha256(compressed).hexdigest(), "compressedBytes": len(compressed),
                "sources": [{"name": name, "url": url, "sha256": hashlib.sha256(data[name]).hexdigest()} for name, url in SOURCES.items()]}
    DESTINATION.mkdir(parents=True, exist_ok=True)
    temporary = DESTINATION / "locations.json.gz.tmp"
    temporary.write_bytes(compressed)
    temporary.replace(DESTINATION / "locations.json.gz")
    (DESTINATION / "locations.manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"counts": counts, "compressedBytes": len(compressed)}))


if __name__ == "__main__":
    main()
