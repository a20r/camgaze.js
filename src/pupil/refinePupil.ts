import type { Point } from "../core/geometry.js";
import type { GrayImage } from "../core/image.js";

export interface PupilRefinement {
  /** Refined center in patch coordinates. */
  center: Point;
  /** Equivalent-circle radius of the segmented pupil blob, in pixels. */
  radius: number;
  /** Number of pixels in the accepted blob. */
  area: number;
}

/**
 * Refines a coarse eye-center estimate to the dark-blob centroid around it,
 * in the spirit of the coarse-positioning stage of ElSe (Fuhl et al.,
 * ETRA 2016): threshold at a low intensity percentile of the patch (the
 * pupil is among the darkest pixels), then flood-fill the connected dark
 * component containing/nearest the seed and take its centroid.
 *
 * Unlike camgaze v1's fixed 10-30 intensity window, the percentile threshold
 * adapts to exposure and skin tone automatically. Returns null when no dark
 * component of plausible size exists near the seed (e.g. during blinks).
 */
export function refinePupil(
  patch: GrayImage,
  seed: Point,
  percentile = 0.02,
  margin = 8
): PupilRefinement | null {
  const { width: w, height: h, data } = patch;
  const n = w * h;

  // Threshold: the intensity of the darkest `percentile` of pixels plus a
  // small margin. The margin absorbs sensor noise around the pupil core
  // without climbing up to iris/shadow intensities.
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[data[i]]++;
  const target = Math.max(1, n * percentile);
  let cdf = 0;
  let thresh = 0;
  for (let v = 0; v < 256; v++) {
    cdf += hist[v];
    if (cdf >= target) {
      thresh = Math.min(255, v + margin);
      break;
    }
  }

  const sx = Math.min(w - 1, Math.max(0, Math.round(seed.x)));
  const sy = Math.min(h - 1, Math.max(0, Math.round(seed.y)));

  // Find a dark seed pixel at or near the coarse center (spiral out a bit —
  // the Timm-Barth argmax can land on the iris rather than the darkest pixel).
  let seedIdx = -1;
  const maxR = Math.max(3, Math.round(Math.min(w, h) * 0.15));
  outer: for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = sx + dx;
        const y = sy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (data[y * w + x] <= thresh) {
          seedIdx = y * w + x;
          break outer;
        }
      }
    }
  }
  if (seedIdx < 0) return null;

  // BFS flood fill of the dark component.
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  queue[tail++] = seedIdx;
  visited[seedIdx] = 1;
  let sumX = 0;
  let sumY = 0;
  let area = 0;
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i / w) | 0;
    sumX += x;
    sumY += y;
    area++;
    if (x > 0 && !visited[i - 1] && data[i - 1] <= thresh) {
      visited[i - 1] = 1;
      queue[tail++] = i - 1;
    }
    if (x < w - 1 && !visited[i + 1] && data[i + 1] <= thresh) {
      visited[i + 1] = 1;
      queue[tail++] = i + 1;
    }
    if (y > 0 && !visited[i - w] && data[i - w] <= thresh) {
      visited[i - w] = 1;
      queue[tail++] = i - w;
    }
    if (y < h - 1 && !visited[i + w] && data[i + w] <= thresh) {
      visited[i + w] = 1;
      queue[tail++] = i + w;
    }
  }

  // Sanity: pupil should be between ~0.2% and ~30% of the eye patch.
  if (area < Math.max(4, n * 0.002) || area > n * 0.3) return null;

  return {
    center: { x: sumX / area + 0.5, y: sumY / area + 0.5 },
    radius: Math.sqrt(area / Math.PI),
    area,
  };
}
