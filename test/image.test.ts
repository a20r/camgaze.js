import { describe, expect, it } from "vitest";
import { clampRect } from "../src/core/geometry.js";
import {
  computeIntegrals,
  createGray,
  cropGray,
  equalizeHistogram,
  resizeGray,
  toGrayscale,
} from "../src/core/image.js";

describe("toGrayscale", () => {
  it("converts pure colors with Rec. 601 weights", () => {
    const rgba = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255,
      ]),
    };
    const gray = toGrayscale(rgba);
    expect(gray.data[0]).toBeCloseTo(76, -1); // 0.299 * 255
    expect(gray.data[1]).toBeCloseTo(150, -1); // 0.587 * 255
    expect(gray.data[2]).toBeCloseTo(28, -1); // 0.114 * 255
  });
});

describe("computeIntegrals", () => {
  it("matches naive summation for random data", () => {
    const w = 17;
    const h = 13;
    const img = createGray(w, h);
    for (let i = 0; i < w * h; i++) img.data[i] = (i * 37) % 256;
    const sum = new Int32Array((w + 1) * (h + 1));
    const sqsum = new Float64Array((w + 1) * (h + 1));
    computeIntegrals(img, sum, sqsum);

    // Rectangle sum via integral vs brute force, several rects.
    const rectSum = (x0: number, y0: number, x1: number, y1: number): number =>
      sum[y0 * (w + 1) + x0] -
      sum[y0 * (w + 1) + x1] -
      sum[y1 * (w + 1) + x0] +
      sum[y1 * (w + 1) + x1];

    for (const [x0, y0, x1, y1] of [
      [0, 0, w, h],
      [2, 3, 9, 11],
      [5, 0, 6, 1],
    ]) {
      let brute = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) brute += img.data[y * w + x];
      expect(rectSum(x0, y0, x1, y1)).toBe(brute);
    }
  });
});

describe("cropGray", () => {
  it("extracts the expected window", () => {
    const img = createGray(4, 4);
    for (let i = 0; i < 16; i++) img.data[i] = i;
    const crop = cropGray(img, { x: 1, y: 2, width: 2, height: 2 });
    expect(Array.from(crop.data)).toEqual([9, 10, 13, 14]);
  });

  it("intersects a crop with the source instead of pinning it to an edge", () => {
    const img = createGray(4, 4);
    for (let i = 0; i < 16; i++) img.data[i] = i;

    const partial = cropGray(img, { x: -1, y: 1, width: 3, height: 2 });
    expect({ width: partial.width, height: partial.height }).toEqual({
      width: 2,
      height: 2,
    });
    expect(Array.from(partial.data)).toEqual([4, 5, 8, 9]);

    const outside = cropGray(img, { x: 4, y: 0, width: 2, height: 2 });
    expect({ width: outside.width, height: outside.height }).toEqual({
      width: 0,
      height: 2,
    });
    expect(outside.data).toHaveLength(0);
  });
});

describe("clampRect", () => {
  it("clips partially out-of-bounds rectangles instead of shifting them", () => {
    expect(
      clampRect({ x: -4, y: -3, width: 10, height: 8 }, 20, 20)
    ).toEqual({ x: 0, y: 0, width: 6, height: 5 });
  });
});

describe("resizeGray", () => {
  it("preserves overall brightness when downscaling", () => {
    const img = createGray(40, 40);
    img.data.fill(100);
    const small = resizeGray(img, 10, 10);
    for (const v of small.data) expect(v).toBe(100);
  });
});

describe("equalizeHistogram", () => {
  it("stretches a low-contrast image to full range", () => {
    const img = createGray(16, 16);
    for (let i = 0; i < 256; i++) img.data[i] = 100 + (i % 20);
    equalizeHistogram(img);
    const max = Math.max(...img.data);
    expect(max).toBeGreaterThan(240);
  });
});
