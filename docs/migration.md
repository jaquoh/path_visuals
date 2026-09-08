# From notebook to application

Inspected `run_data_visuals.ipynb`, `data_visuals.ipynb`, and the filtering notebooks.
The main notebook couples mutable pandas frames to ipywidgets, creates Google Maps
symbols and line objects per observation, and uses random colors, process-wide `chdir`,
hard-coded venues, a Google key, and an ad hoc line-delimited GeoJSON export. It supports
object toggles, paths, points, heatmaps, floor plans, time ranges and static matplotlib exports.

The replacement carries over the central data exploration workflow: local file discovery,
object visibility, segment-aware paths, points, density, floor selection and time playback.
It adds strict input validation, UTC normalization, deterministic palette assignment,
on-demand loading and a bounded cache. Unknown floor values remain unknown.

FastAPI keeps the Python format adapters independent of the interface, with API tests
following [the FastAPI testing guide](https://fastapi.tiangolo.com/tutorial/testing/).
Static hosting follows [StaticFiles](https://fastapi.tiangolo.com/tutorial/static-files/).
[Leaflet](https://leafletjs.com/reference) supplies geographic projection and map interaction;
a single custom canvas draws all movement observations without allocating per-point layers.
Binary timestamp lookup limits the window scanned for short trails. Full-history playback
still redraws all visible observations; parsing, JSON serialization and rendering remain
bounded in-memory operations, not a streaming architecture.

Venue-specific floor-plan polygons/images, bespoke GeoJSON conversion, arbitrary start/end
range filtering and static image export are not ported in this first version. The trail and
cursor provide time exploration; general floor-plan overlays and export can be added as
separate modules. Do not assume feature parity with the entire notebook.

## Extension points

Add adapters yielding dictionaries to `loading.py`, retaining normalization as the shared
contract. For larger workloads, add time-window API queries and spatial/time indexing, then
measure browser frame times before choosing a WebGL renderer. Georeferenced floor plans
belong in an overlay configuration, not in the movement parser. A hosted edition should add
authentication and per-user storage before exposing the data API.
