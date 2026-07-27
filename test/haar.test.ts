import { describe, expect, it } from "vitest";
import {
  HaarDetector,
  groupRectangles,
  type Detection,
  type HaarCascade,
} from "../src/detect/haar.js";
import { eyeCascade } from "../src/detect/cascades/eye.js";
import { frontalFaceCascade } from "../src/detect/cascades/frontalface.js";
import { createGray } from "../src/core/image.js";
import { syntheticEye } from "./helpers.js";

describe("cascade data", () => {
  it("bundles the converted eye and face cascades", () => {
    expect(eyeCascade.size).toEqual([20, 20]);
    expect(eyeCascade.complexClassifiers.length).toBe(24);
    expect(frontalFaceCascade.complexClassifiers.length).toBe(22);
    expect(eyeCascade.tilted).toBe(false);
  });
});

describe("HaarDetector", () => {
  it("returns nothing on a uniform image", () => {
    const img = createGray(320, 240);
    img.data.fill(128);
    const detector = new HaarDetector(eyeCascade);
    expect(detector.detect(img)).toEqual([]);
  });

  it("runs without error on structured input and scales results back", () => {
    const img = syntheticEye(320, 240, 160, 120, 20);
    const detector = new HaarDetector(eyeCascade, { workSize: 160 });
    const detections = detector.detect(img, { minNeighbors: 1 });
    // Not asserting a hit (synthetic blob is not a trained eye), but any
    // result must be inside the frame in original coordinates.
    for (const d of detections) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width).toBeLessThanOrEqual(321);
      expect(d.y + d.height).toBeLessThanOrEqual(241);
    }
  });

  it("scans a window that exactly fills the input image", () => {
    const alwaysMatch: HaarCascade = {
      size: [2, 2],
      tilted: false,
      complexClassifiers: [
        { simpleClassifiers: [], threshold: 0 },
      ],
    };
    const detector = new HaarDetector(alwaysMatch);
    const detections = detector.detect(createGray(2, 2), { minNeighbors: 1 });
    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({ x: 0, y: 0, width: 2, height: 2 });
  });

  it("rejects non-progressing scale factors instead of looping forever", () => {
    const detector = new HaarDetector(eyeCascade);
    expect(() => detector.detect(createGray(40, 40), { scaleFactor: 1 })).toThrow(
      RangeError
    );
  });
});

describe("groupRectangles", () => {
  const det = (x: number, y: number, s: number): Detection => ({
    x,
    y,
    width: s,
    height: s,
    neighbors: 1,
    confidence: 1,
  });

  it("merges overlapping detections and counts neighbors", () => {
    const rects = [det(100, 100, 40), det(102, 101, 40), det(99, 103, 42)];
    const grouped = groupRectangles(rects, 2);
    expect(grouped.length).toBe(1);
    expect(grouped[0].neighbors).toBe(3);
    expect(grouped[0].x).toBeCloseTo((100 + 102 + 99) / 3, 5);
  });

  it("drops singletons below minNeighbors", () => {
    const rects = [det(100, 100, 40), det(300, 50, 38), det(302, 52, 40)];
    const grouped = groupRectangles(rects, 2);
    expect(grouped.length).toBe(1);
    expect(grouped[0].x).toBeGreaterThan(250);
  });

  it("keeps distinct clusters apart", () => {
    const rects = [
      det(50, 50, 40),
      det(52, 51, 40),
      det(400, 300, 40),
      det(401, 302, 40),
    ];
    const grouped = groupRectangles(rects, 2);
    expect(grouped.length).toBe(2);
  });
});
