import type { Point } from "../core/geometry.js";
import { predict, ridgeRegression } from "./ridge.js";

/**
 * The per-frame gaze features the calibrator learns from: normalized pupil
 * positions within each eye box. Either eye may be missing on a given frame.
 */
export interface GazeFeatures {
  /** Pupil center relative to the eye rect, normalized to [0,1] x [0,1]. */
  left?: Point;
  right?: Point;
}

export interface CalibrationSample {
  features: GazeFeatures;
  /** Where the user was actually looking, in screen/page coordinates. */
  target: Point;
}

export interface CalibrationResult {
  /** Number of samples used. */
  samples: number;
  /** Mean Euclidean training error, in target-space units (e.g. px). */
  meanError: number;
}

/**
 * Screen-point calibration via regularized ridge regression, the approach
 * popularized for webcam gaze by WebGazer (Papoutsaki et al., IJCAI 2016).
 *
 * Normalized pupil-in-eye-box positions map near-linearly to screen position
 * over typical head poses, so a small ridge model trained on a 5-13 point
 * calibration generalizes well and is trainable instantly, entirely
 * client-side. Two independent models are fit (screen x and y) over the
 * feature vector [lx, ly, rx, ry, lx*ly, rx*ry, 1], with graceful fallback
 * when only one eye is visible.
 *
 * camgaze v1 had no calibration at all — it exposed a raw pixel offset
 * "gaze vector". v2 keeps that vector available but can now produce actual
 * screen coordinates.
 */
export class GazeCalibrator {
  private samples: CalibrationSample[] = [];
  private wx: Float64Array | null = null;
  private wy: Float64Array | null = null;
  private readonly lambda: number;

  constructor(lambda = 1e-4) {
    this.lambda = lambda;
  }

  /** Record one (features, known target) pair. Call several times per dot. */
  addSample(features: GazeFeatures, target: Point): void {
    if (!features.left && !features.right) return;
    this.samples.push({ features, target });
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  clear(): void {
    this.samples = [];
    this.wx = null;
    this.wy = null;
  }

  get trained(): boolean {
    return this.wx !== null;
  }

  /** Fit the model. Needs samples covering at least a few distinct targets. */
  train(): CalibrationResult {
    if (this.samples.length < 4) {
      throw new Error(
        `Need at least 4 calibration samples, have ${this.samples.length}`
      );
    }
    const X = this.samples.map((s) => featureVector(s.features));
    const tx = this.samples.map((s) => s.target.x);
    const ty = this.samples.map((s) => s.target.y);
    this.wx = ridgeRegression(X, tx, this.lambda);
    this.wy = ridgeRegression(X, ty, this.lambda);

    let err = 0;
    for (let i = 0; i < X.length; i++) {
      const px = predict(this.wx, X[i]);
      const py = predict(this.wy, X[i]);
      err += Math.hypot(px - tx[i], py - ty[i]);
    }
    return { samples: this.samples.length, meanError: err / X.length };
  }

  /** Predict the gaze point for a frame's features; null until trained. */
  estimate(features: GazeFeatures): Point | null {
    if (!this.wx || !this.wy) return null;
    if (!features.left && !features.right) return null;
    const f = featureVector(features);
    return { x: predict(this.wx, f), y: predict(this.wy, f) };
  }
}

/**
 * Build the regression feature vector. Missing eyes are imputed with the
 * other eye's values, which keeps predictions stable through winks and
 * one-eye detection dropouts.
 */
export function featureVector(features: GazeFeatures): number[] {
  const l = features.left ?? features.right;
  const r = features.right ?? features.left;
  if (!l || !r) throw new Error("featureVector requires at least one eye");
  return [l.x, l.y, r.x, r.y, l.x * l.y, r.x * r.y, 1];
}
