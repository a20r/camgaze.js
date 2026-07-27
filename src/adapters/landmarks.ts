import { clampRect, type Point, type Rect } from "../core/geometry.js";
import type { GrayImage } from "../core/image.js";
import type { EyeRegion, EyeRegionProvider } from "../detect/eyeRegions.js";

/**
 * The subset of a face-landmark result camgaze needs: pixel-space contour
 * points for each eye. Deliberately model-agnostic — MediaPipe
 * FaceLandmarker, TF.js facemesh, clmtrackr descendants etc. can all be
 * mapped onto it by the host app.
 */
export interface EyeLandmarks {
  left?: Point[];
  right?: Point[];
}

export type LandmarkSource = (frameWidth: number, frameHeight: number) => EyeLandmarks | null;

/**
 * Eye Aspect Ratio — Soukupova & Cech, CVWW 2016 ("Real-Time Eye Blink
 * Detection using Facial Landmarks"). Expects the standard 6-point eye
 * contour [outer, upper1, upper2, inner, lower2, lower1]; the ratio of lid
 * distance to eye width falls near zero when the eye closes. Typical open
 * eyes sit around 0.25-0.35; below ~0.2 is a blink.
 */
export function eyeAspectRatio(eye: Point[]): number {
  if (eye.length < 6) throw new Error("eyeAspectRatio expects 6 contour points");
  const d = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
  const width = d(eye[0], eye[3]);
  if (width === 0) return 0;
  return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2 * width);
}

/**
 * An {@link EyeRegionProvider} backed by an external face-landmark model.
 * Wire your model's per-frame output in through `source`; camgaze then skips
 * its Haar cascades entirely and derives eye boxes from the landmark
 * contours. Use this when you already run MediaPipe/TF.js in your app — the
 * boxes are tighter and stable under head rotation.
 */
export class LandmarkEyeRegionProvider implements EyeRegionProvider {
  constructor(
    private readonly source: LandmarkSource,
    private readonly padding = 0.35
  ) {}

  findEyes(gray: GrayImage): EyeRegion[] {
    const landmarks = this.source(gray.width, gray.height);
    if (!landmarks) return [];
    const regions: EyeRegion[] = [];
    for (const side of ["left", "right"] as const) {
      const pts = landmarks[side];
      if (!pts || pts.length === 0) continue;
      regions.push({
        rect: boundingBoxWithPadding(pts, this.padding, gray.width, gray.height),
        side,
        confidence: 1,
      });
    }
    return regions;
  }
}

function boundingBoxWithPadding(
  pts: Point[],
  padding: number,
  width: number,
  height: number
): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const padX = (maxX - minX) * padding;
  const padY = (maxY - minY) * padding + (maxX - minX) * 0.15;
  return clampRect(
    {
      x: minX - padX,
      y: minY - padY,
      width: maxX - minX + 2 * padX,
      height: maxY - minY + 2 * padY,
    },
    width,
    height
  );
}
