/** First observation after the cursor; timestamps are sorted by the server. */
export function upperBound(points, time) {
  let low = 0,
    high = points.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (points[mid].time <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function visiblePoints(points, time, trail) {
  const end = upperBound(points, time);
  const start = trail ? upperBound(points, time - trail - 0.000001) : 0;
  return points.slice(start, end);
}

export function connects(a, b) {
  return a.segment === b.segment && a.level === b.level;
}
