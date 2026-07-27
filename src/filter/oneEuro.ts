import type { Point } from "../core/geometry.js";

export interface OneEuroOptions {
  /** Minimum cutoff frequency (Hz). Lower = smoother when still. Default 1. */
  minCutoff?: number;
  /** Speed coefficient. Higher = less lag during fast motion. Default 0.007. */
  beta?: number;
  /** Cutoff for the derivative low-pass. Default 1. */
  dCutoff?: number;
}

class LowPass {
  private y = 0;
  private initialized = false;

  filter(x: number, alpha: number): number {
    if (!this.initialized) {
      this.initialized = true;
      this.y = x;
      return x;
    }
    this.y = alpha * x + (1 - alpha) * this.y;
    return this.y;
  }

  last(): number {
    return this.y;
  }

  reset(): void {
    this.initialized = false;
  }
}

/**
 * The One Euro filter — Casiez, Roussel & Vogel, CHI 2012. The de-facto
 * standard for smoothing noisy interactive input: an adaptive low-pass whose
 * cutoff rises with speed, so fixations are rock-steady (jitter removed)
 * while saccades stay responsive (minimal lag). Replaces camgaze v1's
 * fixed-length moving average, which had to choose between the two.
 */
export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private readonly x = new LowPass();
  private readonly dx = new LowPass();
  private lastTime: number | null = null;

  constructor(options: OneEuroOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1;
    this.beta = options.beta ?? 0.007;
    this.dCutoff = options.dCutoff ?? 1;
  }

  /** Filter one sample. `timestamp` is in milliseconds. */
  filter(value: number, timestamp: number): number {
    let dt = 1 / 60;
    if (this.lastTime !== null && timestamp > this.lastTime) {
      dt = (timestamp - this.lastTime) / 1000;
    }
    this.lastTime = timestamp;

    const alphaFor = (cutoff: number): number => {
      const tau = 1 / (2 * Math.PI * cutoff);
      return 1 / (1 + tau / dt);
    };

    const dValue = (value - (this.lastValue ?? value)) / dt;
    this.lastValue = value;
    const edValue = this.dx.filter(dValue, alphaFor(this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edValue);
    return this.x.filter(value, alphaFor(cutoff));
  }

  private lastValue: number | null = null;

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.lastTime = null;
    this.lastValue = null;
  }
}

/** Convenience: a One Euro filter per axis for 2D points. */
export class OneEuroFilter2D {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;

  constructor(options: OneEuroOptions = {}) {
    this.fx = new OneEuroFilter(options);
    this.fy = new OneEuroFilter(options);
  }

  filter(p: Point, timestamp: number): Point {
    return {
      x: this.fx.filter(p.x, timestamp),
      y: this.fy.filter(p.y, timestamp),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}
