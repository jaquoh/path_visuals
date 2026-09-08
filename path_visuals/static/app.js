import { MovementMap, colors } from "./map.js";
const $ = (id) => document.getElementById(id);
const map = new MovementMap();
let dataset = null,
  selected = new Set(),
  mode = "paths",
  playing = false,
  cursor = 0;
let requestId = 0,
  lastFrame = 0,
  lastDraw = 0;
const date = (time) =>
  new Date(time * 1000).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
function notice(message = "") {
  $("notice").hidden = !message;
  $("notice").textContent = message;
}
async function json(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail || "Could not load data.");
  return body;
}
function activeTracks() {
  return dataset?.tracks.filter((t) => selected.has(t.object_id)) || [];
}
function pause() {
  playing = false;
  $("play").textContent = "▶";
  $("play").setAttribute("aria-label", "Play movement");
}
function render() {
  const tracks = activeTracks();
  $("object-count").textContent = tracks.length;
  $("point-count").textContent = tracks
    .reduce((n, t) => n + t.points.length, 0)
    .toLocaleString();
  $("toggle-all").textContent = selected.size ? "Hide all" : "Show all";
  if (!dataset) {
    map.update([], 0, 0, mode, "all");
    return;
  }
  $("clock").textContent = date(cursor);
  $("time").value =
    dataset.end === dataset.start
      ? 1000
      : ((cursor - dataset.start) / (dataset.end - dataset.start)) * 1000;
  map.update(tracks, cursor, Number($("trail").value), mode, $("floor").value);
  if (!tracks.length)
    notice("No objects selected. Enable an object to show its movement.");
  else notice();
}
function renderTracks() {
  $("tracks").replaceChildren();
  for (const track of dataset.tracks) {
    const label = document.createElement("label");
    label.className = "track";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = selected.has(track.object_id);
    input.addEventListener("change", () => {
      input.checked
        ? selected.add(track.object_id)
        : selected.delete(track.object_id);
      render();
    });
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = colors[track.color % colors.length];
    const name = document.createElement("span");
    name.textContent = track.object_id;
    const count = document.createElement("small");
    count.textContent = track.points.length.toLocaleString();
    label.append(input, swatch, name, count);
    $("tracks").append(label);
  }
}
async function load(name) {
  const id = ++requestId;
  pause();
  dataset = null;
  selected.clear();
  render();
  $("tracks").replaceChildren();
  $("play").disabled = true;
  $("time").disabled = true;
  $("dataset-title").textContent = name;
  $("clock").textContent = "—";
  $("duration").textContent = "—";
  $("start").textContent = "—";
  $("end").textContent = "—";
  notice("Loading movement data…");
  for (const button of $("files").children)
    button.setAttribute("aria-pressed", button.dataset.name === name);
  try {
    const result = await json(`/api/dataset?name=${encodeURIComponent(name)}`);
    if (id !== requestId) return;
    dataset = result;
    dataset.tracks.forEach((track, i) => (track.color = i));
    selected = new Set(dataset.tracks.map((t) => t.object_id));
    cursor = dataset.end;
    const floors = new Set(
      dataset.tracks.flatMap((t) => t.points.map((p) => p.level ?? "unknown")),
    );
    $("floor").replaceChildren(new Option("All floors", "all"));
    for (const floor of [...floors].sort())
      $("floor").add(
        new Option(floor === "unknown" ? "Unknown" : `Floor ${floor}`, floor),
      );
    $("duration").textContent =
      `${Math.round((dataset.end - dataset.start) / 60)} min`;
    $("start").textContent = date(dataset.start);
    $("end").textContent = date(dataset.end);
    $("play").disabled = dataset.start === dataset.end;
    $("time").disabled = dataset.start === dataset.end;
    renderTracks();
    map.fit(activeTracks());
    render();
  } catch (error) {
    if (id === requestId) notice(error.message);
  }
}
async function refresh() {
  $("refresh").disabled = true;
  try {
    const files = await json("/api/files");
    const current = dataset?.name;
    $("files").replaceChildren();
    for (const file of files) {
      const button = document.createElement("button");
      button.className = "file";
      button.dataset.name = file.name;
      const name = document.createElement("span");
      name.textContent = file.name;
      const size = document.createElement("small");
      size.textContent = `${Math.max(1, Math.round(file.bytes / 1024))} KB`;
      button.append(name, size);
      button.addEventListener("click", () => load(file.name));
      $("files").append(button);
    }
    if (files.length)
      await load(
        files.some((f) => f.name === current)
          ? current
          : (files.find((f) => f.name === "demo-city.csv") || files[0]).name,
      );
    else {
      ++requestId;
      pause();
      dataset = null;
      selected.clear();
      render();
      $("tracks").replaceChildren();
      $("play").disabled = true;
      $("time").disabled = true;
      $("dataset-title").textContent = "Your next journey starts here";
      $("clock").textContent = "—";
      $("duration").textContent = "—";
      $("start").textContent = "—";
      $("end").textContent = "—";
      notice(
        "No data files yet. Paste a CSV, TSV or GPX into data/ and refresh.",
      );
    }
  } catch (error) {
    notice(error.message);
  } finally {
    $("refresh").disabled = false;
  }
}
$("refresh").addEventListener("click", refresh);
$("toggle-all").addEventListener("click", () => {
  if (!dataset) return;
  selected = selected.size
    ? new Set()
    : new Set(dataset.tracks.map((t) => t.object_id));
  renderTracks();
  render();
});
$("fit").addEventListener("click", () => map.fit(activeTracks()));
$("basemap").addEventListener("change", (e) =>
  map.background(e.target.checked),
);
for (const id of ["trail", "floor"]) $(id).addEventListener("change", render);
for (const button of document.querySelectorAll("[data-mode]"))
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    for (const item of document.querySelectorAll("[data-mode]"))
      item.setAttribute("aria-pressed", item === button);
    render();
  });
$("time").addEventListener("input", () => {
  if (!dataset) return;
  pause();
  cursor =
    dataset.start +
    (Number($("time").value) / 1000) * (dataset.end - dataset.start);
  render();
});
$("reset").addEventListener("click", () => {
  if (!dataset) return;
  pause();
  cursor = dataset.start;
  render();
});
$("play").addEventListener("click", () => {
  if (!dataset) return;
  if (playing) return pause();
  if (cursor >= dataset.end) cursor = dataset.start;
  playing = true;
  lastFrame = performance.now();
  $("play").textContent = "Ⅱ";
  $("play").setAttribute("aria-label", "Pause movement");
});
function frame(now) {
  if (playing && dataset) {
    cursor = Math.min(
      dataset.end,
      cursor +
        Math.min((now - lastFrame) / 1000, 0.25) * Number($("speed").value),
    );
    if (now - lastDraw > 50 || cursor >= dataset.end) {
      render();
      lastDraw = now;
    }
    if (cursor >= dataset.end) pause();
  }
  lastFrame = now;
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
$("help").addEventListener("click", () => $("guide").showModal());
$("close-guide").addEventListener("click", () => $("guide").close());
requestAnimationFrame(frame);
refresh();
