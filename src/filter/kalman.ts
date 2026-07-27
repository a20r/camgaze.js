import type { Point } from "../core/geometry.js";

export interface Kalman2DOptions {
  /** Process noise intensity. Default 0.01. */
  processNoise?: number;
  /** Measurement noise variance. Default 4. */
  measurementNoise?: number;
}

/**
 * A constant-velocity Kalman filter over 2D positions (state:
 * [x, y, vx, vy]). Offered as an alternative to the One Euro filter for
 * consumers who want velocity estimates (e.g. saccade detection) along with
 * the smoothed point.
 */
export class Kalman2D {
  // State and covariance.
  private s = new Float64Array(4);
  private P = Float64Array.from([1e3, 0, 0, 0, 0, 1e3, 0, 0, 0, 0, 1e3, 0, 0, 0, 0, 1e3]);
  private readonly q: number;
  private readonly r: number;
  private initialized = false;
  private lastTime: number | null = null;

  constructor(options: Kalman2DOptions = {}) {
    this.q = options.processNoise ?? 0.01;
    this.r = options.measurementNoise ?? 4;
  }

  /** Update with a measurement; returns the filtered position. */
  filter(p: Point, timestamp: number): Point {
    let dt = 1 / 60;
    if (this.lastTime !== null && timestamp > this.lastTime) {
      dt = (timestamp - this.lastTime) / 1000;
    }
    this.lastTime = timestamp;

    if (!this.initialized) {
      this.initialized = true;
      this.s[0] = p.x;
      this.s[1] = p.y;
      return { ...p };
    }

    const s = this.s;
    const P = this.P;

    // Predict: x' = F x with F = [[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]]
    s[0] += dt * s[2];
    s[1] += dt * s[3];

    // P' = F P F^T + Q (discrete white-noise acceleration model)
    const dt2 = dt * dt;
    const dt3 = dt2 * dt / 2;
    const dt4 = dt2 * dt2 / 4;
    const FP = P.slice();
    // rows of F P
    for (let c = 0; c < 4; c++) {
      FP[0 * 4 + c] = P[0 * 4 + c] + dt * P[2 * 4 + c];
      FP[1 * 4 + c] = P[1 * 4 + c] + dt * P[3 * 4 + c];
    }
    // (F P) F^T
    for (let rIdx = 0; rIdx < 4; rIdx++) {
      const c0 = FP[rIdx * 4 + 0] + dt * FP[rIdx * 4 + 2];
      const c1 = FP[rIdx * 4 + 1] + dt * FP[rIdx * 4 + 3];
      P[rIdx * 4 + 0] = c0;
      P[rIdx * 4 + 1] = c1;
      P[rIdx * 4 + 2] = FP[rIdx * 4 + 2];
      P[rIdx * 4 + 3] = FP[rIdx * 4 + 3];
    }
    P[0] += dt4 * this.q;
    P[5] += dt4 * this.q;
    P[2] += dt3 * this.q;
    P[7] += dt3 * this.q;
    P[8] += dt3 * this.q;
    P[13] += dt3 * this.q;
    P[10] += dt2 * this.q;
    P[15] += dt2 * this.q;

    // Update with measurement z = [px, py], H = [[1,0,0,0],[0,1,0,0]].
    // Innovation covariance S = H P H^T + R is diagonal-ish 2x2.
    const s00 = P[0] + this.r;
    const s01 = P[1];
    const s10 = P[4];
    const s11 = P[5] + this.r;
    const det = s00 * s11 - s01 * s10;
    const i00 = s11 / det;
    const i01 = -s01 / det;
    const i10 = -s10 / det;
    const i11 = s00 / det;

    // Kalman gain K = P H^T S^-1 (4x2)
    const K = new Float64Array(8);
    for (let rIdx = 0; rIdx < 4; rIdx++) {
      const ph0 = P[rIdx * 4 + 0];
      const ph1 = P[rIdx * 4 + 1];
      K[rIdx * 2 + 0] = ph0 * i00 + ph1 * i10;
      K[rIdx * 2 + 1] = ph0 * i01 + ph1 * i11;
    }

    const yx = p.x - s[0];
    const yy = p.y - s[1];
    for (let rIdx = 0; rIdx < 4; rIdx++) {
      s[rIdx] += K[rIdx * 2] * yx + K[rIdx * 2 + 1] * yy;
    }

    // P = (I - K H) P
    const newP = P.slice();
    for (let rIdx = 0; rIdx < 4; rIdx++) {
      for (let c = 0; c < 4; c++) {
        newP[rIdx * 4 + c] =
          P[rIdx * 4 + c] -
          (K[rIdx * 2] * P[0 * 4 + c] + K[rIdx * 2 + 1] * P[1 * 4 + c]);
      }
    }
    this.P = newP;

    return { x: s[0], y: s[1] };
  }

  /** Current velocity estimate in px/s. */
  velocity(): Point {
    return { x: this.s[2], y: this.s[3] };
  }

  reset(): void {
    this.initialized = false;
    this.lastTime = null;
    this.s.fill(0);
    this.P = Float64Array.from([1e3, 0, 0, 0, 0, 1e3, 0, 0, 0, 0, 1e3, 0, 0, 0, 0, 1e3]);
  }
}
