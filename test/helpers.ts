import { createGray, type GrayImage } from "../src/core/image.js";

/** Draw a filled circle of the given intensity onto a gray image. */
export function drawCircle(
  img: GrayImage,
  cx: number,
  cy: number,
  radius: number,
  value: number
): void {
  const r2 = radius * radius;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) img.data[y * img.width + x] = value;
    }
  }
}

/**
 * A synthetic eye patch: light background with mild vertical shading, a
 * mid-gray iris disc and a dark pupil disc, plus deterministic noise.
 */
export function syntheticEye(
  width: number,
  height: number,
  cx: number,
  cy: number,
  pupilRadius: number
): GrayImage {
  const img = createGray(width, height);
  let seed = 42;
  const rand = (): number => {
    // deterministic LCG noise
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      img.data[y * width + x] = 200 - y * 0.2 + (rand() - 0.5) * 12;
    }
  }
  drawCircle(img, cx, cy, pupilRadius * 2.2, 120); // iris
  drawCircle(img, cx, cy, pupilRadius, 15); // pupil
  return img;
}
