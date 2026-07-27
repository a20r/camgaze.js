import { describe, expect, it } from "vitest";
import { locateEyeCenter } from "../src/pupil/timmBarth.js";
import { refinePupil } from "../src/pupil/refinePupil.js";
import { createGray } from "../src/core/image.js";
import { syntheticEye } from "./helpers.js";

describe("locateEyeCenter (Timm & Barth)", () => {
  it("finds a centered pupil", () => {
    const img = syntheticEye(60, 40, 30, 20, 5);
    const { center, confidence } = locateEyeCenter(img);
    expect(Math.hypot(center.x - 30, center.y - 20)).toBeLessThan(3);
    expect(confidence).toBeGreaterThan(0.05);
  });

  it("finds an off-center pupil", () => {
    const img = syntheticEye(64, 44, 45, 16, 6);
    const { center } = locateEyeCenter(img);
    expect(Math.hypot(center.x - 45, center.y - 16)).toBeLessThan(3.5);
  });

  it("reports low confidence on a featureless patch (blink-like)", () => {
    const img = createGray(60, 40);
    img.data.fill(180);
    const centered = locateEyeCenter(img);
    const withEye = locateEyeCenter(syntheticEye(60, 40, 30, 20, 5));
    expect(centered.confidence).toBeLessThan(withEye.confidence);
    expect(centered.confidence).toBeLessThan(0.05);
  });
});

describe("refinePupil", () => {
  it("recovers centroid and radius of the dark blob", () => {
    const img = syntheticEye(80, 60, 40, 30, 8);
    const result = refinePupil(img, { x: 37, y: 28 });
    expect(result).not.toBeNull();
    expect(Math.hypot(result!.center.x - 40, result!.center.y - 30)).toBeLessThan(2);
    expect(result!.radius).toBeGreaterThan(6);
    expect(result!.radius).toBeLessThan(10);
  });

  it("returns null on a patch with no plausible pupil", () => {
    const img = createGray(60, 40);
    img.data.fill(200);
    // A uniform patch thresholds everything equally; blob covers the whole
    // image and is rejected by the size sanity check.
    expect(refinePupil(img, { x: 30, y: 20 })).toBeNull();
  });
});
