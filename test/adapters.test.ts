import { describe, expect, it } from "vitest";
import {
  eyeAspectRatio,
  LandmarkEyeRegionProvider,
} from "../src/adapters/landmarks.js";
import { createGray } from "../src/core/image.js";
import type { Point } from "../src/core/geometry.js";

const openEye: Point[] = [
  { x: 0, y: 5 }, // outer corner
  { x: 3, y: 2 }, // upper
  { x: 7, y: 2 },
  { x: 10, y: 5 }, // inner corner
  { x: 7, y: 8 }, // lower
  { x: 3, y: 8 },
];

describe("eyeAspectRatio", () => {
  it("is high for an open eye and near zero when closed", () => {
    const open = eyeAspectRatio(openEye);
    const closed = eyeAspectRatio(
      openEye.map((p) => ({ x: p.x, y: 5 + (p.y - 5) * 0.05 }))
    );
    expect(open).toBeGreaterThan(0.4);
    expect(closed).toBeLessThan(0.1);
  });

  it("rejects malformed input", () => {
    expect(() => eyeAspectRatio(openEye.slice(0, 3))).toThrow();
  });
});

describe("LandmarkEyeRegionProvider", () => {
  it("derives padded, labeled eye boxes from landmark contours", () => {
    const provider = new LandmarkEyeRegionProvider(() => ({
      left: openEye.map((p) => ({ x: p.x + 100, y: p.y + 80 })),
      right: openEye.map((p) => ({ x: p.x + 180, y: p.y + 80 })),
    }));
    const regions = provider.findEyes(createGray(320, 240));
    expect(regions.length).toBe(2);
    const left = regions.find((r) => r.side === "left")!;
    expect(left.rect.x).toBeLessThan(100);
    expect(left.rect.x + left.rect.width).toBeGreaterThan(110);
    expect(left.rect.width).toBeGreaterThan(10);
  });

  it("returns no regions when the source has no face", () => {
    const provider = new LandmarkEyeRegionProvider(() => null);
    expect(provider.findEyes(createGray(64, 64))).toEqual([]);
  });
});
