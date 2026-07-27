import {
  rectCenter,
  sub,
  type Point,
  type Rect,
} from "../core/geometry.js";
import { cropGray, type GrayImage } from "../core/image.js";
import {
  HaarEyeRegionProvider,
  type EyeRegion,
  type EyeRegionProvider,
} from "../detect/eyeRegions.js";
import type { HaarCascade } from "../detect/haar.js";
import { eyeCascade } from "../detect/cascades/eye.js";
import { frontalFaceCascade } from "../detect/cascades/frontalface.js";
import { OneEuroFilter2D, type OneEuroOptions } from "../filter/oneEuro.js";
import { locateEyeCenter } from "../pupil/timmBarth.js";
import { refinePupil } from "../pupil/refinePupil.js";
import { GazeCalibrator, type GazeFeatures } from "../gaze/calibration.js";
import { Camera, type CameraOptions } from "../media/camera.js";

export interface TrackedEye {
  side: "left" | "right" | "unknown";
  /** Eye bounding box in frame coordinates. */
  rect: Rect;
  /** Pupil center in frame coordinates (temporally smoothed). */
  pupil: Point;
  /** Pupil center normalized to the eye rect ([0,1] x [0,1]). */
  normalizedPupil: Point;
  /** Estimated pupil radius in pixels, when the blob refinement succeeded. */
  pupilRadius: number | null;
  /**
   * Gradient-alignment confidence in [0, 1] from the Timm-Barth objective.
   * Near zero during blinks or on spurious regions.
   */
  confidence: number;
  /**
   * The calibration-free "gaze vector": pupil displacement from the eye-box
   * center, as in camgaze v1. Useful for relative gaze gestures.
   */
  gazeVector: Point;
}

export interface GazeFrame {
  /** Milliseconds timestamp of the processed frame. */
  timestamp: number;
  eyes: TrackedEye[];
  /**
   * Calibrated gaze point in the coordinates calibration targets were given
   * in (typically page pixels); null until the calibrator is trained or when
   * both eyes are lost.
   */
  gazePoint: Point | null;
  /** True when all detected eyes have blink-level confidence. */
  blink: boolean;
  /** The features fed to the calibrator, when at least one eye was usable. */
  features: GazeFeatures | null;
}

export interface GazeTrackerOptions {
  camera?: CameraOptions;
  /** Bring your own region provider (e.g. LandmarkEyeRegionProvider). */
  eyeRegionProvider?: EyeRegionProvider;
  /** Override the built-in cascades (only used by the default provider). */
  eyeCascade?: HaarCascade;
  faceCascade?: HaarCascade;
  /** One Euro smoothing parameters for pupil centers. */
  smoothing?: OneEuroOptions | false;
  /** Confidence below which an eye counts as blinking/lost. Default 0.05. */
  blinkConfidenceThreshold?: number;
}

export type GazeListener = (frame: GazeFrame) => void;

/**
 * The main camgaze v2 pipeline:
 *
 *   camera -> eye regions (face-gated Haar, or your landmark model)
 *          -> pupil localization (Timm-Barth gradients + dark-blob refinement)
 *          -> One Euro smoothing
 *          -> optional ridge-regression calibration to screen coordinates
 *
 * Emits one {@link GazeFrame} per processed video frame via `on("gaze", ...)`.
 */
export class GazeTracker {
  readonly calibration: GazeCalibrator;
  private cameraInstance: Camera | null = null;
  private readonly cameraOptions?: CameraOptions;
  private readonly provider: EyeRegionProvider;
  private readonly smoothingOptions: OneEuroOptions | false;
  private readonly blinkThreshold: number;
  private readonly filters = new Map<string, OneEuroFilter2D>();
  private listeners = new Set<GazeListener>();
  private rafId: number | null = null;
  private videoFrameCallbackId: number | null = null;
  private running = false;
  /** Most recently produced frame, for polling-style consumers. */
  lastFrame: GazeFrame | null = null;

  constructor(options: GazeTrackerOptions = {}) {
    this.cameraOptions = options.camera;
    this.calibration = new GazeCalibrator();
    this.provider =
      options.eyeRegionProvider ??
      new HaarEyeRegionProvider(
        options.eyeCascade ?? eyeCascade,
        options.faceCascade ?? frontalFaceCascade
      );
    this.smoothingOptions = options.smoothing ?? {};
    this.blinkThreshold = options.blinkConfidenceThreshold ?? 0.05;
  }

  /**
   * The tracker's camera (created on first access — requires a DOM). When
   * driving the tracker headlessly via {@link processFrame}, never touch it.
   */
  get camera(): Camera {
    if (!this.cameraInstance) {
      this.cameraInstance = new Camera(this.cameraOptions);
    }
    return this.cameraInstance;
  }

  /** Subscribe to per-frame gaze results. Returns an unsubscribe function. */
  on(event: "gaze", listener: GazeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Start the camera and the processing loop. */
  async start(): Promise<void> {
    if (this.running) return;
    await this.camera.start();
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      const frame = this.processFrame();
      for (const listener of this.listeners) listener(frame);
      this.scheduleNext(loop);
    };
    this.scheduleNext(loop);
  }

  /** Stop processing and release the camera. */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (
      this.videoFrameCallbackId !== null &&
      "cancelVideoFrameCallback" in this.camera.video
    ) {
      this.camera.video.cancelVideoFrameCallback(this.videoFrameCallbackId);
    }
    this.rafId = null;
    this.videoFrameCallbackId = null;
    this.cameraInstance?.stop();
    this.filters.clear();
  }

  private scheduleNext(loop: () => void): void {
    // requestVideoFrameCallback processes exactly one iteration per camera
    // frame (not per display refresh) when available.
    if ("requestVideoFrameCallback" in this.camera.video) {
      this.videoFrameCallbackId = this.camera.video.requestVideoFrameCallback(
        () => loop()
      );
    } else {
      this.rafId = requestAnimationFrame(() => loop());
    }
  }

  /**
   * Process the current camera frame synchronously. Exposed so the tracker
   * can be driven by an external loop (or tests) instead of `start()`.
   */
  processFrame(gray: GrayImage = this.camera.getGrayFrame()): GazeFrame {
    const timestamp =
      typeof performance !== "undefined" ? performance.now() : 0;
    const regions = this.provider.findEyes(gray);
    const eyes: TrackedEye[] = [];

    for (const region of regions) {
      const eye = this.trackEye(gray, region, timestamp);
      if (eye) eyes.push(eye);
    }

    const usable = eyes.filter((e) => e.confidence >= this.blinkThreshold);
    const features: GazeFeatures | null =
      usable.length > 0
        ? {
            left: usable.find((e) => e.side === "left")?.normalizedPupil ??
              (usable[0].side === "unknown" ? usable[0].normalizedPupil : undefined),
            right: usable.find((e) => e.side === "right")?.normalizedPupil,
          }
        : null;

    const frame: GazeFrame = {
      timestamp,
      eyes,
      features,
      blink: eyes.length > 0 && usable.length === 0,
      gazePoint:
        features && this.calibration.trained
          ? this.calibration.estimate(features)
          : null,
    };
    this.lastFrame = frame;
    return frame;
  }

  private trackEye(
    gray: GrayImage,
    region: EyeRegion,
    timestamp: number
  ): TrackedEye | null {
    const rect = region.rect;
    if (rect.width < 8 || rect.height < 8) return null;
    const patch = cropGray(gray, {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });

    const coarse = locateEyeCenter(patch);
    const refined = refinePupil(patch, coarse.center);
    const localCenter = refined?.center ?? coarse.center;

    const raw: Point = {
      x: rect.x + localCenter.x,
      y: rect.y + localCenter.y,
    };

    const side = region.side ?? "unknown";
    let pupil = raw;
    if (this.smoothingOptions !== false) {
      let filter = this.filters.get(side);
      if (!filter) {
        filter = new OneEuroFilter2D(this.smoothingOptions);
        this.filters.set(side, filter);
      }
      pupil = filter.filter(raw, timestamp);
    }

    return {
      side,
      rect,
      pupil,
      normalizedPupil: {
        x: (pupil.x - rect.x) / rect.width,
        y: (pupil.y - rect.y) / rect.height,
      },
      pupilRadius: refined?.radius ?? null,
      confidence: coarse.confidence,
      gazeVector: sub(pupil, rectCenter(rect)),
    };
  }

  /**
   * Convenience for calibration UIs: record the current frame's features
   * against a known on-screen target. Returns false when no eye was usable.
   */
  addCalibrationPoint(target: Point): boolean {
    const features = this.lastFrame?.features;
    if (!features) return false;
    this.calibration.addSample(features, target);
    return true;
  }
}
