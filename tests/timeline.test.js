import { test } from "node:test";
import assert from "node:assert/strict";
import {
  upperBound,
  visiblePoints,
  connects,
} from "../path_visuals/static/timeline.js";
const points = [1, 2, 2, 5].map((time) => ({ time }));
test("cursor includes equal timestamps and handles boundaries", () => {
  assert.equal(upperBound(points, 0), 0);
  assert.equal(upperBound(points, 2), 3);
  assert.equal(upperBound(points, 6), 4);
  assert.equal(upperBound([], 6), 0);
});
test("trail includes exact lower and upper boundaries", () => {
  assert.deepEqual(
    visiblePoints(points, 5, 3).map((p) => p.time),
    [2, 2, 5],
  );
  assert.deepEqual(
    visiblePoints(points, 2, 0).map((p) => p.time),
    [1, 2, 2],
  );
});
test("paths cannot bridge segments or floors", () => {
  assert.equal(
    connects({ segment: "a", level: null }, { segment: "b", level: null }),
    false,
  );
  assert.equal(
    connects({ segment: "a", level: "1" }, { segment: "a", level: "2" }),
    false,
  );
  assert.equal(
    connects({ segment: "a", level: null }, { segment: "a", level: null }),
    true,
  );
});
