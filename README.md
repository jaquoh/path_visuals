# Path Visuals

A local Python web app for exploring object movements over time. Choose a dataset,
toggle objects, filter floors, and replay paths, observations, or density on a map.

## Run locally

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then from this folder:

```sh
uv sync --locked
uv run uvicorn path_visuals.app:app --reload --host 127.0.0.1 --port 8765
```

Open **http://127.0.0.1:8765**. No Google API key, notebook server, Node build, or database
is required. Python 3.11+ is supported; the dependency lock was tested with Python 3.12.
The server defaults to the repository's `data/` folder independently of working directory.
Set `PATH_VISUALS_DATA=/absolute/path` to use another folder.

## Add your data

Paste `.csv`, `.tsv`, or `.gpx` files directly into `data/`. Click **Refresh** in the
sidebar and select a file. Files are listed without parsing; the selected dataset is
loaded on demand. Use object checkboxes or **Hide all / Show all** to control tracks.
Refresh also reloads an edited file. Subdirectories and symlinks are not scanned.
User datasets are ignored by Git by default; only the synthetic demos are committed.

## Supported data structures

### CSV / TSV (canonical interchange format)

UTF-8, with a header and comma, semicolon, or tab delimiters. Decimal numbers use a dot.

```csv
object_id,timestamp,latitude,longitude,segment,level
bike-01,2026-09-08T08:00:00Z,52.516,13.378,trip-1,
bike-01,2026-09-08T08:01:00Z,52.517,13.379,trip-1,
van-02,2026-09-08T08:01:00+00:00,52.518,13.380,trip-2,0
```

| Column | Required | Meaning |
| --- | --- | --- |
| `timestamp` | Yes | ISO 8601 time. Offset-aware values are converted to UTC; no offset means UTC. |
| `latitude` | Yes | WGS84 decimal degrees, −90 to 90. |
| `longitude` | Yes | WGS84 decimal degrees, −180 to 180. |
| `object_id` | No | Object identity. Defaults to filename without extension. |
| `segment` | No | Disconnected trip/segment identity. Defaults to `0`. |
| `level` | No | Floor label. Blank stays unknown; it is never inferred as ground floor. |

Legacy aliases: `user` → `object_id`, `time` → `timestamp`, `lat` → `latitude`,
`lon` or `lng` → `longitude`. This accepts the notebook's six-column CSVs directly.
Extra columns are ignored. Rows are sorted per object; duplicate observations are retained.
Paths break when segment or floor changes. Invalid rows reject the file with an error;
points are never silently dropped. Limits are 25 MiB and 100,000 observations per file.

### GPX 1.0 / 1.1

Each `<trk>` becomes an object, identified by its name and track index. `<trkseg>`
boundaries are preserved. Every `<trkpt lat="…" lon="…">` needs a `<time>` child.
GPX elevation is not interpreted as a floor. Untimed waypoints and routes are not movement
tracks: convert them into timestamped CSV first. See `data/demo-walk.gpx`.

Other sources (JSON, GeoJSON, spreadsheet exports, databases) should export the canonical
CSV columns above. The original bespoke GeoJSON format is not a direct input adapter yet.
Projected/indoor coordinates must first be transformed into WGS84. Paths crossing the
antimeridian are not wrapped specially in this version.

## Playback semantics

The cursor includes observations at or before its time; trail settings restrict their age.
Markers show the last recorded position in the visible trail; positions are not interpolated.
The initial view shows the complete recording. Play starts from the beginning when at the end.
Speed is simulated seconds per real second. Playback pauses when the tab is hidden.
Statistics describe selected objects across the whole recording, regardless of floor or cursor.
Density is observation concentration, not time-weighted dwell time.

## Development

```sh
uv run pytest -q
uv run ruff check path_visuals scripts tests
uv run ruff format --check path_visuals scripts tests
npm ci                         # optional Node 20+ development tools
npm test
npx playwright install chromium
npm run test:browser
npm run format:check
uv run python scripts/generate_demo.py
```

- `path_visuals/loading.py`: CSV/GPX adapters and normalization.
- `path_visuals/catalog.py`: confined discovery and four-entry cache keyed by file modification/size.
- `path_visuals/app.py`: FastAPI routes and static hosting; API reference at `/docs`.
- `path_visuals/static/`: responsive interface, map canvas, timeline logic; pinned Leaflet 1.9.4.
- `scripts/generate_demo.py`: reproducible fictional city, campus, and GPX datasets.
- `tests/`: parser, API, confinement, cache invalidation and playback tests.
- `docs/migration.md`: notebook findings, design choices, and extension opportunities.

Runtime dependencies are locked in `uv.lock`. Leaflet is vendored with its license so the
interface works without a CDN. Only the optional OpenStreetMap background needs internet;
tile requests reveal the viewed area to the tile provider. Data files and API processing stay
on the local server. Disable **Map background** for a grid-only view. Respect the
[OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/) when deploying.

This is a local foundation, not a multiuser hosted service. Before remote deployment, add
access control, deployment-specific limits, a licensed tile provider, and large-dataset
benchmarks. The current canvas avoids per-point DOM objects and redraws at up to 20 fps
during playback; it is not a claim of measured performance at the maximum file size.

## Git

The original `notebook-source/` archive remains locally intact and is excluded from Git:
it includes historical tracking data, embedded notebook output, and a hard-coded Google
API key. Review that key's status and revoke it if still active. New user data is also ignored.
No remote is configured. Once a new remote exists, add it and push `main`.
