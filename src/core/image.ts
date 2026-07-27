import type { Rect } from "./geometry.js";

/**
 * A single-channel 8-bit image. The minimal common currency between all of
 * camgaze's vision routines — works in workers and Node (no DOM types needed).
 */
export interface GrayImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Anything shaped like an ImageData (RGBA interleaved). */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createGray(width: number, height: number): GrayImage {
  return { width, height, data: new Uint8ClampedArray(width * height) };
}

/**
 * RGBA -> grayscale using Rec. 601 luma coefficients (integer arithmetic).
 */
export function toGrayscale(src: RGBAImage, out?: GrayImage): GrayImage {
  const n = src.width * src.height;
  const gray = out ?? createGray(src.width, src.height);
  const g = gray.data;
  const d = src.data;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    g[i] = (d[j] * 77 + d[j + 1] * 151 + d[j + 2] * 28) >> 8;
  }
  return gray;
}

/**
 * Extract a sub-image. The rect is snapped to integer pixels and clamped to
 * the source bounds (fractional offsets would silently shear the rows).
 */
export function cropGray(src: GrayImage, rect: Rect): GrayImage {
  const left = Math.round(rect.x);
  const top = Math.round(rect.y);
  const right = left + Math.max(0, Math.round(rect.width));
  const bottom = top + Math.max(0, Math.round(rect.height));
  const x = Math.max(0, Math.min(left, src.width));
  const y0 = Math.max(0, Math.min(top, src.height));
  const x1 = Math.max(x, Math.min(right, src.width));
  const y1 = Math.max(y0, Math.min(bottom, src.height));
  const w = x1 - x;
  const h = y1 - y0;
  const out = createGray(w, h);
  for (let y = 0; y < h; y++) {
    const srcOff = (y0 + y) * src.width + x;
    out.data.set(src.data.subarray(srcOff, srcOff + w), y * w);
  }
  return out;
}

/**
 * Area-averaging downscale to the given size. Good enough for detector
 * pre-shrink and pupil-search windows without ringing artifacts.
 */
export function resizeGray(
  src: GrayImage,
  width: number,
  height: number,
  out?: GrayImage
): GrayImage {
  out ??= createGray(width, height);
  const xRatio = src.width / width;
  const yRatio = src.height / height;
  for (let y = 0; y < height; y++) {
    const sy0 = Math.floor(y * yRatio);
    const sy1 = Math.min(src.height, Math.max(sy0 + 1, Math.floor((y + 1) * yRatio)));
    for (let x = 0; x < width; x++) {
      const sx0 = Math.floor(x * xRatio);
      const sx1 = Math.min(src.width, Math.max(sx0 + 1, Math.floor((x + 1) * xRatio)));
      let sum = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        const row = sy * src.width;
        for (let sx = sx0; sx < sx1; sx++) sum += src.data[row + sx];
      }
      out.data[y * width + x] = sum / ((sy1 - sy0) * (sx1 - sx0));
    }
  }
  return out;
}

/** In-place histogram equalization. */
export function equalizeHistogram(img: GrayImage): GrayImage {
  const n = img.width * img.height;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[img.data[i]]++;
  const lut = new Uint8ClampedArray(256);
  let cdf = 0;
  for (let v = 0; v < 256; v++) {
    cdf += hist[v];
    lut[v] = (cdf * 255) / n;
  }
  for (let i = 0; i < n; i++) img.data[i] = lut[img.data[i]];
  return img;
}

/**
 * Computes summed-area tables. `sum` and `sqsum` must have length
 * (width + 1) * (height + 1); row/col 0 are zero so lookups need no bounds
 * checks. This is the classic integral-image layout used by Viola-Jones.
 */
export function computeIntegrals(
  img: GrayImage,
  sum: Int32Array,
  sqsum: Float64Array
): void {
  const w = img.width;
  const h = img.height;
  const w1 = w + 1;
  sum.fill(0, 0, w1);
  sqsum.fill(0, 0, w1);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    let rowSq = 0;
    const srcRow = y * w;
    const dstRow = (y + 1) * w1;
    sum[dstRow] = 0;
    sqsum[dstRow] = 0;
    for (let x = 0; x < w; x++) {
      const v = img.data[srcRow + x];
      rowSum += v;
      rowSq += v * v;
      sum[dstRow + x + 1] = sum[dstRow - w1 + x + 1] + rowSum;
      sqsum[dstRow + x + 1] = sqsum[dstRow - w1 + x + 1] + rowSq;
    }
  }
}

/**
 * Separable 3x3 box blur, used to denoise eye patches before gradient
 * computation. Returns a new image.
 */
export function boxBlur3(src: GrayImage): GrayImage {
  const { width: w, height: h } = src;
  const tmp = new Float32Array(w * h);
  const out = createGray(w, h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      tmp[row + x] =
        (src.data[row + x0] + src.data[row + x] + src.data[row + x1]) / 3;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = (y > 0 ? y - 1 : 0) * w;
    const y1 = y * w;
    const y2 = (y < h - 1 ? y + 1 : h - 1) * w;
    for (let x = 0; x < w; x++) {
      out.data[y1 + x] = (tmp[y0 + x] + tmp[y1 + x] + tmp[y2 + x]) / 3;
    }
  }
  return out;
}
