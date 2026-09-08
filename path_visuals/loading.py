"""Format adapters normalize input into sorted, validated WGS84 observations."""

import csv
import math
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from defusedxml import ElementTree

SUPPORTED = {".csv", ".tsv", ".gpx"}
MAX_BYTES = 25 * 1024 * 1024
MAX_POINTS = 100_000


def csv_rows(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        sample = source.read(8192)
        source.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error as exc:
            raise ValueError("Expected a comma, semicolon, or tab separated header.") from exc
        reader = csv.DictReader(source, dialect=dialect)
        for row in reader:
            yield {key.strip().lower(): value for key, value in row.items() if key}


def gpx_rows(path: Path):
    root = ElementTree.parse(path).getroot()
    # Strip namespaces so both GPX 1.0 and 1.1 work.
    for element in root.iter():
        element.tag = element.tag.rsplit("}", 1)[-1]
    for index, track in enumerate(root.findall("trk")):
        name = track.findtext("name") or path.stem
        for segment, group in enumerate(track.findall("trkseg")):
            for point in group.findall("trkpt"):
                yield {
                    "object_id": f"{name} [{index + 1}]",
                    "segment": str(segment),
                    "latitude": point.get("lat"),
                    "longitude": point.get("lon"),
                    "timestamp": point.findtext("time"),
                }


def normalize(row: dict, fallback: str) -> tuple[str, dict]:
    timestamp = row.get("timestamp") or row.get("time")
    if not timestamp:
        raise ValueError("timestamp is required (ISO 8601).")
    date = datetime.fromisoformat(timestamp.strip())
    if date.tzinfo is None:
        date = date.replace(tzinfo=UTC)
    lat = float(row.get("latitude") or row.get("lat") or "")
    lon = float(row.get("longitude") or row.get("lon") or row.get("lng") or "")
    if (
        not math.isfinite(lat)
        or not math.isfinite(lon)
        or not -90 <= lat <= 90
        or not -180 <= lon <= 180
    ):
        raise ValueError("latitude/longitude must be finite WGS84 coordinates in range.")
    object_id = (row.get("object_id") or row.get("user") or fallback).strip() or fallback
    return object_id, {
        "time": date.timestamp(),
        "latitude": lat,
        "longitude": lon,
        "segment": (row.get("segment") or "0").strip(),
        "level": (row.get("level") or "").strip() or None,
    }


def load_dataset(path: Path) -> dict:
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(
            "File exceeds the 25 MiB local dataset limit. Split it into smaller files."
        )
    if path.suffix.lower() not in SUPPORTED:
        raise ValueError("Supported files: CSV, TSV, GPX.")
    tracks = defaultdict(list)
    count = 0
    try:
        rows = gpx_rows(path) if path.suffix.lower() == ".gpx" else csv_rows(path)
        for number, row in enumerate(rows, start=2):
            try:
                object_id, point = normalize(row, path.stem)
            except (ValueError, TypeError, OverflowError) as exc:
                raise ValueError(f"Row {number}: {exc}") from exc
            tracks[object_id].append(point)
            count += 1
            if count > MAX_POINTS:
                raise ValueError("Dataset exceeds 100,000 points. Split it into smaller files.")
    except (ElementTree.ParseError, UnicodeError, csv.Error) as exc:
        raise ValueError(f"Cannot parse {path.suffix} file: {exc}") from exc
    if not count:
        raise ValueError("No movement points found. Add timestamp, latitude and longitude rows.")
    result = [
        {"object_id": key, "points": sorted(points, key=lambda p: p["time"])}
        for key, points in sorted(tracks.items())
    ]
    return {
        "name": path.name,
        "count": count,
        "tracks": result,
        "start": min(t["points"][0]["time"] for t in result),
        "end": max(t["points"][-1]["time"] for t in result),
    }
