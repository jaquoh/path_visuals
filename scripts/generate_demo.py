"""Reproducible, fictional Berlin movement data; no real tracking records."""

import csv
from datetime import UTC, datetime, timedelta
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
ROUTES = [
    (
        "Courier 01",
        [
            (52.5163, 13.3777),
            (52.5163, 13.390),
            (52.520, 13.390),
            (52.520, 13.405),
            (52.525, 13.405),
        ],
    ),
    (
        "Service van",
        [
            (52.509, 13.383),
            (52.509, 13.401),
            (52.5163, 13.401),
            (52.5163, 13.415),
            (52.522, 13.415),
        ],
    ),
    (
        "Cargo bike",
        [
            (52.525, 13.3777),
            (52.5163, 13.3777),
            (52.5163, 13.405),
            (52.509, 13.405),
            (52.509, 13.415),
        ],
    ),
]


def generate():
    DATA.mkdir(exist_ok=True)
    start = datetime(2026, 9, 8, 8, tzinfo=UTC)
    with (DATA / "demo-city.csv").open("w", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["object_id", "timestamp", "latitude", "longitude", "segment", "level"])
        for name, route in ROUTES:
            for i in range(241):
                leg = min(i // 60, 3)
                f = (i - leg * 60) / 60
                a, b = route[leg : leg + 2]
                writer.writerow(
                    [
                        name,
                        (start + timedelta(seconds=i * 15)).isoformat(),
                        round(a[0] + (b[0] - a[0]) * f, 7),
                        round(a[1] + (b[1] - a[1]) * f, 7),
                        0,
                        "",
                    ]
                )
    with (DATA / "demo-campus.csv").open("w", newline="") as output:
        writer = csv.writer(output, delimiter=";")
        writer.writerow(["object_id", "timestamp", "latitude", "longitude", "segment", "level"])
        for robot in range(4):
            for i in range(121):
                corners = [
                    (52.517, 13.391),
                    (52.517, 13.394),
                    (52.519, 13.394),
                    (52.519, 13.391),
                    (52.517, 13.391),
                ]
                leg = min(i // 30, 3)
                a, b = corners[leg : leg + 2]
                f = (i - leg * 30) / 30
                writer.writerow(
                    [
                        f"Robot {robot + 1:02}",
                        (start + timedelta(seconds=i * 10 + robot * 60)).isoformat(),
                        a[0] + (b[0] - a[0]) * f + robot * 0.0001,
                        a[1] + (b[1] - a[1]) * f,
                        0,
                        robot % 2,
                    ]
                )
    points = "".join(
        f'<trkpt lat="{lat}" lon="{lon}"><time>{(start + timedelta(minutes=i * 10)).isoformat()}</time></trkpt>'
        for i, (lat, lon) in enumerate(ROUTES[0][1])
    )
    (DATA / "demo-walk.gpx").write_text(
        f'<?xml version="1.0"?><gpx version="1.1" creator="Path Visuals" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Morning walk</name><trkseg>{points}</trkseg></trk></gpx>'
    )


if __name__ == "__main__":
    generate()
