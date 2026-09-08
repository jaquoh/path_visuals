import { visiblePoints, connects } from "./timeline.js";
export const colors = [
  "#16805d",
  "#c77228",
  "#446bd0",
  "#bd4770",
  "#777224",
  "#237e95",
];

/** One canvas for all observations; no per-point DOM or Leaflet objects. */
export class MovementMap {
  constructor() {
    this.map = L.map("map", { zoomControl: false, preferCanvas: true }).setView(
      [52.517, 13.395],
      14,
    );
    L.control.zoom({ position: "topright" }).addTo(this.map);
    L.control
      .scale({ imperial: false, position: "bottomright" })
      .addTo(this.map);
    this.tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.tiles.on("tileerror", () => {
      document.querySelector("#map-status").textContent =
        "Background unavailable · tracks remain visible";
    });
    this.canvas = L.DomUtil.create(
      "canvas",
      "movement-canvas",
      this.map.getPanes().overlayPane,
    );
    this.canvas.style.pointerEvents = "none";
    this.map.on("move zoom resize", () => this.draw());
    new ResizeObserver(() => this.map.invalidateSize()).observe(
      document.querySelector("#map"),
    );
  }
  background(enabled) {
    if (enabled) this.tiles.addTo(this.map);
    else this.tiles.remove();
  }
  fit(tracks) {
    let south = Infinity,
      west = Infinity,
      north = -Infinity,
      east = -Infinity;
    for (const track of tracks)
      for (const p of track.points) {
        south = Math.min(south, p.latitude);
        north = Math.max(north, p.latitude);
        west = Math.min(west, p.longitude);
        east = Math.max(east, p.longitude);
      }
    if (Number.isFinite(south))
      this.map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [55, 55], maxZoom: 18, animate: false },
      );
  }
  update(tracks, time, trail, mode, floor) {
    this.view = { tracks, time, trail, mode, floor };
    this.draw();
  }
  draw() {
    const size = this.map.getSize(),
      ratio = window.devicePixelRatio || 1;
    L.DomUtil.setPosition(
      this.canvas,
      this.map.containerPointToLayerPoint([0, 0]),
    );
    this.canvas.width = size.x * ratio;
    this.canvas.height = size.y * ratio;
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;
    const ctx = this.canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    if (!this.view) return;
    const { tracks, time, trail, mode, floor } = this.view;
    for (const track of tracks) {
      const points = visiblePoints(track.points, time, trail);
      const color = colors[track.color % colors.length];
      const onFloor = (p) =>
        floor === "all" || (p.level ?? "unknown") === floor;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      let previous = null,
        head = null;
      for (const p of points) {
        if (!onFloor(p)) {
          previous = null;
          continue;
        }
        const pixel = this.map.latLngToContainerPoint([
          p.latitude,
          p.longitude,
        ]);
        if (mode === "paths") {
          if (previous && connects(previous, p)) ctx.lineTo(pixel.x, pixel.y);
          else ctx.moveTo(pixel.x, pixel.y);
        } else if (mode === "points") {
          ctx.moveTo(pixel.x + 3, pixel.y);
          ctx.arc(pixel.x, pixel.y, 3, 0, Math.PI * 2);
        } else {
          const gradient = ctx.createRadialGradient(
            pixel.x,
            pixel.y,
            0,
            pixel.x,
            pixel.y,
            18,
          );
          gradient.addColorStop(0, "#d26c2230");
          gradient.addColorStop(1, "#e4b54200");
          ctx.fillStyle = gradient;
          ctx.fillRect(pixel.x - 18, pixel.y - 18, 36, 36);
        }
        previous = p;
        head = pixel;
      }
      if (mode === "paths") ctx.stroke();
      if (mode === "points") ctx.fill();
      if (head && mode !== "heat") {
        ctx.beginPath();
        ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
}
