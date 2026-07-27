import type { Point } from "../core/geometry.js";
import { boxBlur3, resizeGray, type GrayImage } from "../core/image.js";

export interface EyeCenterResult {
  /** Estimated eye center in the coordinates of the input patch. */
  center: Point;
  /**
   * Normalized peak of the gradient-alignment objective in [0, 1].
   * Higher means the gradients agree more strongly on a single center;
   * drops sharply during blinks and on false eye regions.
   */
  confidence: number;
}

export interface TimmBarthOptions {
  /** Patch is downscaled so its larger side is at most this. Default 42. */
  maxSize?: number;
  /**
   * Keep only gradients with magnitude above mean + k * std.
   * Default k = 0.3 (value suggested in the paper's reference implementation).
   */
  gradientThresholdK?: number;
  /** Weight candidate centers by darkness (pupils are dark). Default true. */
  useDarknessWeight?: boolean;
}

/**
 * Eye-center localization by means of gradients — Timm & Barth, VISAPP 2011
 * ("Accurate Eye Centre Localisation by Means of Gradients").
 *
 * The pupil/iris is a dark disc, so image gradients on its boundary all point
 * radially away from its center. For every candidate center c we score how
 * well the displacement vectors d_i = (x_i - c)/|x_i - c| align with the
 * gradient directions g_i, using sum((d_i . g_i)^2), optionally weighted by
 * the darkness of c. The argmax is the eye center.
 *
 * This replaces camgaze v1's brute-force intensity-threshold sweep: it needs
 * no per-user threshold tuning, is robust to illumination, glasses glare and
 * partial occlusion by eyelids, and returns a meaningful confidence.
 *
 * Complexity is O(centers x gradients); both sets live in a <=42px-wide
 * downscaled patch and gradients are magnitude-thresholded, keeping a call
 * well under a millisecond.
 */
export function locateEyeCenter(
  patch: GrayImage,
  options: TimmBarthOptions = {}
): EyeCenterResult {
  const maxSize = options.maxSize ?? 42;
  const k = options.gradientThresholdK ?? 0.3;
  const useDark = options.useDarknessWeight ?? true;

  const scaleDown = Math.min(
    1,
    maxSize / Math.max(patch.width, patch.height)
  );
  const w = Math.max(3, Math.round(patch.width * scaleDown));
  const h = Math.max(3, Math.round(patch.height * scaleDown));
  const img = boxBlur3(
    scaleDown < 1 ? resizeGray(patch, w, h) : patch
  );

  // Central-difference gradients.
  const n = w * h;
  const gx = new Float32Array(n);
  const gy = new Float32Array(n);
  const mag = new Float32Array(n);
  let magSum = 0;
  let magSqSum = 0;
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x;
      const dx = (img.data[i + 1] - img.data[i - 1]) / 2;
      const dy = (img.data[i + w] - img.data[i - w]) / 2;
      const m = Math.hypot(dx, dy);
      gx[i] = dx;
      gy[i] = dy;
      mag[i] = m;
      magSum += m;
      magSqSum += m * m;
    }
  }
  const inner = (w - 2) * (h - 2);
  const mean = magSum / inner;
  const std = Math.sqrt(Math.max(0, magSqSum / inner - mean * mean));
  const magThresh = mean + k * std;

  // Collect significant, normalized gradients.
  const gxs: number[] = [];
  const gys: number[] = [];
  const gxi: number[] = [];
  const gyi: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x;
      if (mag[i] > magThresh && mag[i] > 0) {
        gxs.push(gx[i] / mag[i]);
        gys.push(gy[i] / mag[i]);
        gxi.push(x);
        gyi.push(y);
      }
    }
  }

  const m = gxs.length;
  if (m === 0) {
    return { center: { x: patch.width / 2, y: patch.height / 2 }, confidence: 0 };
  }

  // Darkness prior: smoothed inverted intensity.
  let bestScore = -1;
  let bestX = w >> 1;
  let bestY = h >> 1;
  for (let cy = 0; cy < h; cy++) {
    const rowOff = cy * w;
    for (let cx = 0; cx < w; cx++) {
      let sum = 0;
      for (let i = 0; i < m; i++) {
        const dx = gxi[i] - cx;
        const dy = gyi[i] - cy;
        if (dx === 0 && dy === 0) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dot = (dx * gxs[i] + dy * gys[i]) / dist;
        if (dot > 0) sum += dot * dot;
      }
      let score = sum / m;
      if (useDark) score *= (255 - img.data[rowOff + cx]) / 255;
      if (score > bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = cy;
      }
    }
  }

  // Map back to input-patch coordinates (center of the winning cell).
  const inv = 1 / (scaleDown || 1);
  return {
    center: { x: (bestX + 0.5) * inv, y: (bestY + 0.5) * inv },
    // The objective's theoretical max is 1 (all gradients aligned); in
    // practice good fixations land around 0.15-0.45, blinks near 0.
    confidence: Math.min(1, bestScore),
  };
}
