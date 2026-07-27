import { clampRect, type Rect } from "../core/geometry.js";
import type { GrayImage } from "../core/image.js";
import { cropGray } from "../core/image.js";
import { HaarDetector, type HaarCascade } from "./haar.js";

/** An eye region proposal in frame coordinates. */
export interface EyeRegion {
  rect: Rect;
  /** Which eye, when the provider can tell. "left" = viewer's left in the image. */
  side?: "left" | "right";
  confidence: number;
}

/**
 * Anything that can propose eye regions for a frame. The built-in provider
 * uses Haar cascades; an adapter backed by a face-landmark model (e.g.
 * MediaPipe FaceLandmarker) can be plugged in instead — see
 * `adapters/landmarks.ts`.
 */
export interface EyeRegionProvider {
  findEyes(gray: GrayImage): EyeRegion[];
}

export interface HaarEyeRegionProviderOptions {
  /** Re-run the (expensive) face cascade every N frames. Default 10. */
  faceRedetectInterval?: number;
  faceDetector?: HaarDetector;
}

/**
 * Face-gated eye detection: find the largest face, then run the eye cascade
 * only inside the eye band of that face (upper half, minus the forehead).
 * This is dramatically more robust than the original camgaze approach of
 * running the eye cascade over the whole frame — eyebrows, nostrils and
 * background clutter no longer produce phantom eyes — and much cheaper.
 *
 * The face box is cached between frames and refreshed periodically since
 * heads move slowly relative to frame rate.
 */
export class HaarEyeRegionProvider implements EyeRegionProvider {
  private readonly eyeDetector: HaarDetector;
  private readonly faceDetector?: HaarDetector;
  private readonly faceInterval: number;
  private faceBox: Rect | null = null;
  private framesSinceFaceDetect = Infinity;

  constructor(
    eyeCascade: HaarCascade,
    faceCascade?: HaarCascade,
    options: HaarEyeRegionProviderOptions = {}
  ) {
    this.eyeDetector = new HaarDetector(eyeCascade, { workSize: 160 });
    this.faceDetector =
      options.faceDetector ??
      (faceCascade ? new HaarDetector(faceCascade, { workSize: 160 }) : undefined);
    this.faceInterval = options.faceRedetectInterval ?? 10;
  }

  findEyes(gray: GrayImage): EyeRegion[] {
    const searchArea = this.updateFaceBox(gray);
    const local = cropGray(gray, searchArea);
    const detections = this.eyeDetector.detect(local, {
      minNeighbors: 2,
      scaleFactor: 1.15,
    });

    const regions: EyeRegion[] = detections.map((d) => ({
      rect: clampRect(
        {
          x: d.x + searchArea.x,
          y: d.y + searchArea.y,
          width: d.width,
          height: d.height,
        },
        gray.width,
        gray.height
      ),
      confidence: d.confidence,
    }));

    // Keep the two strongest, then label them by horizontal order.
    regions.sort((a, b) => b.confidence - a.confidence);
    const kept = regions.slice(0, 2);
    if (kept.length === 2) {
      kept.sort((a, b) => a.rect.x - b.rect.x);
      kept[0].side = "left";
      kept[1].side = "right";
    } else if (kept.length === 1 && this.faceBox) {
      const faceMid = this.faceBox.x + this.faceBox.width / 2;
      kept[0].side =
        kept[0].rect.x + kept[0].rect.width / 2 < faceMid ? "left" : "right";
    }
    return kept;
  }

  /** The face rectangle currently gating the eye search, if any. */
  getFaceBox(): Rect | null {
    return this.faceBox;
  }

  private updateFaceBox(gray: GrayImage): Rect {
    if (this.faceDetector) {
      if (this.framesSinceFaceDetect >= this.faceInterval) {
        const faces = this.faceDetector.detect(gray, { minNeighbors: 2 });
        if (faces.length > 0) {
          this.faceBox = faces.reduce((a, b) =>
            a.width * a.height >= b.width * b.height ? a : b
          );
        }
        this.framesSinceFaceDetect = 0;
      }
      this.framesSinceFaceDetect++;
    }

    if (this.faceBox) {
      // Eye band: skip the forehead (top ~20%) and everything below the
      // vertical midpoint of the face.
      return clampRect(
        {
          x: this.faceBox.x,
          y: this.faceBox.y + this.faceBox.height * 0.18,
          width: this.faceBox.width,
          height: this.faceBox.height * 0.42,
        },
        gray.width,
        gray.height
      );
    }
    return { x: 0, y: 0, width: gray.width, height: gray.height };
  }
}
