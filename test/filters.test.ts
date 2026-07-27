import { describe, expect, it } from "vitest";
import { OneEuroFilter, OneEuroFilter2D } from "../src/filter/oneEuro.js";
import { Kalman2D } from "../src/filter/kalman.js";

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff - 0.5;
  };
}

describe("OneEuroFilter", () => {
  it("passes a constant signal through unchanged", () => {
    const f = new OneEuroFilter();
    let out = 0;
    for (let i = 0; i < 50; i++) out = f.filter(10, i * 16);
    expect(out).toBeCloseTo(10, 6);
  });

  it("reduces jitter on a noisy stationary signal", () => {
    const rand = lcg(7);
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0.007 });
    const raw: number[] = [];
    const filtered: number[] = [];
    for (let i = 0; i < 300; i++) {
      const v = 100 + rand() * 10;
      raw.push(v);
      filtered.push(f.filter(v, i * 16));
    }
    const variance = (xs: number[]): number => {
      const m = xs.reduce((a, b) => a + b) / xs.length;
      return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
    };
    // Skip warmup.
    expect(variance(filtered.slice(50))).toBeLessThan(
      variance(raw.slice(50)) * 0.5
    );
  });

  it("tracks fast motion with modest lag", () => {
    const f = new OneEuroFilter();
    let out = 0;
    for (let i = 0; i < 100; i++) out = f.filter(i * 10, i * 16); // fast ramp
    expect(Math.abs(out - 990)).toBeLessThan(60);
  });
});

describe("OneEuroFilter2D", () => {
  it("filters both axes independently", () => {
    const f = new OneEuroFilter2D();
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 50; i++) p = f.filter({ x: 3, y: -8 }, i * 16);
    expect(p.x).toBeCloseTo(3, 5);
    expect(p.y).toBeCloseTo(-8, 5);
  });
});

describe("Kalman2D", () => {
  it("converges to a stationary target", () => {
    const k = new Kalman2D();
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 100; i++) p = k.filter({ x: 50, y: 70 }, i * 16);
    expect(p.x).toBeCloseTo(50, 1);
    expect(p.y).toBeCloseTo(70, 1);
  });

  it("tracks constant velocity and estimates it", () => {
    const k = new Kalman2D({ processNoise: 1, measurementNoise: 1 });
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 200; i++) {
      // 100 px/s along x, 60 fps
      p = k.filter({ x: (i * 100) / 60, y: 0 }, i * (1000 / 60));
    }
    expect(p.x).toBeCloseTo((199 * 100) / 60, 0);
    expect(k.velocity().x).toBeGreaterThan(60);
    expect(k.velocity().x).toBeLessThan(140);
  });

  it("smooths noisy measurements", () => {
    const rand = lcg(99);
    const k = new Kalman2D();
    const errs: number[] = [];
    for (let i = 0; i < 200; i++) {
      const p = k.filter({ x: 200 + rand() * 20, y: 100 + rand() * 20 }, i * 16);
      if (i > 50) errs.push(Math.hypot(p.x - 200, p.y - 100));
    }
    const meanErr = errs.reduce((a, b) => a + b) / errs.length;
    expect(meanErr).toBeLessThan(3);
  });
});
