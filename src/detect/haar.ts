import type { Rect } from "../core/geometry.js";
import {
  computeIntegrals,
  createGray,
  equalizeHistogram,
  resizeGray,
  type GrayImage,
} from "../core/image.js";

/**
 * Cascade format shared with js-objectdetect / jsfeat: each feature is
 * [x, y, w, h, weight] in cascade-window coordinates.
 */
export interface HaarFeature extends Array<number> {}

export interface HaarWeakClassifier {
  features: HaarFeature[];
  threshold: number;
  left_val: number;
  right_val: number;
  tilted?: number;
}

export interface HaarStage {
  simpleClassifiers: HaarWeakClassifier[];
  threshold: number;
}

export interface HaarCascade {
  complexClassifiers: HaarStage[];
  size: [number, number];
  tilted: boolean;
}

export interface Detection extends Rect {
  neighbors: number;
  confidence: number;
}

export interface HaarDetectorOptions {
  /** Working image width the frame is shrunk to before scanning. Default 200. */
  workSize?: number;
  /** Multiplier between scan scales. Default 1.15. */
  scaleFactor?: number;
  /** Initial scale (in cascade windows). Default 1. */
  minScale?: number;
  /** Minimum grouped neighbors for a detection to survive. Default 2. */
  minNeighbors?: number;
}

/**
 * A dependency-free Viola-Jones cascade detector. Port of the jsfeat haar
 * scanner the original camgaze relied on, with variance-normalized stage
 * evaluation and OpenCV-style rectangle grouping.
 *
 * Buffers are reused across frames, so create one detector per cascade and
 * call {@link detect} repeatedly.
 */
export class HaarDetector {
  private readonly cascade: HaarCascade;
  private readonly workSize: number;
  private sum = new Int32Array(0);
  private sqsum = new Float64Array(0);
  private work: GrayImage | null = null;

  constructor(cascade: HaarCascade, options: HaarDetectorOptions = {}) {
    if (cascade.tilted) {
      throw new Error(
        "camgaze's HaarDetector only supports upright cascades (tilted: false)"
      );
    }
    this.cascade = cascade;
    this.workSize = options.workSize ?? 200;
  }

  /**
   * Detect objects in a grayscale frame. Results are in the coordinate space
   * of `img` (the internal downscale is undone before returning).
   */
  detect(img: GrayImage, options: HaarDetectorOptions = {}): Detection[] {
    const scaleFactor = options.scaleFactor ?? 1.15;
    const minScale = options.minScale ?? 1;
    const minNeighbors = options.minNeighbors ?? 2;

    const shrink = Math.min(
      1,
      (options.workSize ?? this.workSize) / Math.max(img.width, img.height)
    );
    const w = Math.max(1, Math.round(img.width * shrink));
    const h = Math.max(1, Math.round(img.height * shrink));
    // Copy into a reused buffer (equalization is in-place and must not
    // mutate the caller's image).
    if (!this.work || this.work.width !== w || this.work.height !== h) {
      this.work = createGray(w, h);
    }
    const work = this.work;
    if (shrink < 1) {
      resizeGray(img, w, h, work);
    } else {
      work.data.set(img.data);
    }
    equalizeHistogram(work);

    const need = (w + 1) * (h + 1);
    if (this.sum.length < need) {
      this.sum = new Int32Array(need);
      this.sqsum = new Float64Array(need);
    }
    computeIntegrals(work, this.sum, this.sqsum);

    let rects: Detection[] = [];
    let scale = minScale;
    const [cw, ch] = this.cascade.size;
    while (scale * cw < w && scale * ch < h) {
      rects = rects.concat(this.detectSingleScale(w, h, scale));
      scale *= scaleFactor;
    }

    const grouped = groupRectangles(rects, minNeighbors);
    const inv = 1 / shrink;
    return grouped.map((r) => ({
      x: r.x * inv,
      y: r.y * inv,
      width: r.width * inv,
      height: r.height * inv,
      neighbors: r.neighbors,
      confidence: r.confidence,
    }));
  }

  private detectSingleScale(
    width: number,
    height: number,
    scale: number
  ): Detection[] {
    const classifier = this.cascade;
    const sum = this.sum;
    const sqsum = this.sqsum;
    const winW = (classifier.size[0] * scale) | 0;
    const winH = (classifier.size[1] * scale) | 0;
    const step = (0.5 * scale + 1.5) | 0;
    const endX = width - winW;
    const endY = height - winH;
    const w1 = width + 1;
    const invArea = 1 / (winW * winH);
    const iiB = winW;
    const iiC = winH * w1;
    const iiD = iiC + winW;
    const stages = classifier.complexClassifiers;
    const rects: Detection[] = [];

    for (let y = 0; y <= endY; y += step) {
      let iiA = y * w1;
      for (let x = 0; x <= endX; x += step, iiA += step) {
        const mean =
          (sum[iiA] - sum[iiA + iiB] - sum[iiA + iiC] + sum[iiA + iiD]) *
          invArea;
        const variance =
          (sqsum[iiA] -
            sqsum[iiA + iiB] -
            sqsum[iiA + iiC] +
            sqsum[iiA + iiD]) *
            invArea -
          mean * mean;
        const std = variance > 0 ? Math.sqrt(variance) : 1;

        let found = true;
        let stageSum = 0;
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const trees = stage.simpleClassifiers;
          stageSum = 0;
          for (let j = 0; j < trees.length; j++) {
            const tree = trees[j];
            const features = tree.features;
            let treeSum = 0;
            for (let k = 0; k < features.length; k++) {
              const f = features[k];
              const fiA = ~~(x + f[0] * scale) + ~~(y + f[1] * scale) * w1;
              const fw = ~~(f[2] * scale);
              const fiC = ~~(f[3] * scale) * w1;
              treeSum +=
                (sum[fiA] -
                  sum[fiA + fw] -
                  sum[fiA + fiC] +
                  sum[fiA + fiC + fw]) *
                f[4];
            }
            stageSum +=
              treeSum * invArea < tree.threshold * std
                ? tree.left_val
                : tree.right_val;
          }
          if (stageSum < stage.threshold) {
            found = false;
            break;
          }
        }

        if (found) {
          rects.push({
            x,
            y,
            width: winW,
            height: winH,
            neighbors: 1,
            confidence: stageSum,
          });
          x += step;
          iiA += step;
        }
      }
    }
    return rects;
  }
}

/**
 * OpenCV-style rectangle grouping: cluster raw detections whose positions and
 * sizes are similar, average each cluster, and drop clusters with fewer than
 * `minNeighbors` members. Ported from jsfeat.
 */
export function groupRectangles(
  rects: Detection[],
  minNeighbors = 1
): Detection[] {
  const n = rects.length;
  const similar = (r1: Detection, r2: Detection): boolean => {
    const distance = (r1.width * 0.25 + 0.5) | 0;
    return (
      r2.x <= r1.x + distance &&
      r2.x >= r1.x - distance &&
      r2.y <= r1.y + distance &&
      r2.y >= r1.y - distance &&
      r2.width <= ((r1.width * 1.5 + 0.5) | 0) &&
      ((r2.width * 1.5 + 0.5) | 0) >= r1.width
    );
  };

  // Union-find over pairwise-similar rectangles.
  const parent = new Int32Array(n).fill(-1);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== -1) root = parent[root];
    while (parent[i] !== -1) {
      const next = parent[i];
      parent[i] = root;
      i = next;
    }
    return root;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (similar(rects[i], rects[j])) {
        const ri = find(i);
        const rj = find(j);
        if (ri !== rj) parent[rj] = ri;
      }
    }
  }

  const clusters = new Map<
    number,
    { n: number; x: number; y: number; w: number; h: number; conf: number }
  >();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const c =
      clusters.get(root) ?? { n: 0, x: 0, y: 0, w: 0, h: 0, conf: -Infinity };
    c.n++;
    c.x += rects[i].x;
    c.y += rects[i].y;
    c.w += rects[i].width;
    c.h += rects[i].height;
    c.conf = Math.max(c.conf, rects[i].confidence);
    clusters.set(root, c);
  }

  const averaged: Detection[] = [];
  for (const c of clusters.values()) {
    if (c.n >= minNeighbors) {
      averaged.push({
        x: c.x / c.n,
        y: c.y / c.n,
        width: c.w / c.n,
        height: c.h / c.n,
        neighbors: c.n,
        confidence: c.conf,
      });
    }
  }

  // Drop small low-support rectangles nested inside stronger ones.
  return averaged.filter((r1) =>
    averaged.every((r2) => {
      if (r1 === r2) return true;
      const distance = (r2.width * 0.25 + 0.5) | 0;
      const nested =
        r1.x >= r2.x - distance &&
        r1.y >= r2.y - distance &&
        r1.x + r1.width <= r2.x + r2.width + distance &&
        r1.y + r1.height <= r2.y + r2.height + distance;
      return !(
        nested &&
        (r2.neighbors > Math.max(3, r1.neighbors) || r1.neighbors < 3)
      );
    })
  );
}
