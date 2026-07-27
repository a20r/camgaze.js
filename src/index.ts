// camgaze v2 — webcam eye tracking and gaze estimation in the browser.

export type { Point, Rect } from "./core/geometry.js";
export {
  add,
  sub,
  scale,
  dist,
  magnitude,
  rectCenter,
  rectContains,
  iou,
  clampRect,
} from "./core/geometry.js";

export type { GrayImage, RGBAImage } from "./core/image.js";
export {
  createGray,
  toGrayscale,
  cropGray,
  resizeGray,
  equalizeHistogram,
  computeIntegrals,
  boxBlur3,
} from "./core/image.js";

export {
  HaarDetector,
  groupRectangles,
  type HaarCascade,
  type HaarStage,
  type HaarWeakClassifier,
  type Detection,
  type HaarDetectorOptions,
} from "./detect/haar.js";
export {
  HaarEyeRegionProvider,
  type EyeRegion,
  type EyeRegionProvider,
  type HaarEyeRegionProviderOptions,
} from "./detect/eyeRegions.js";
export { eyeCascade } from "./detect/cascades/eye.js";
export { frontalFaceCascade } from "./detect/cascades/frontalface.js";

export {
  locateEyeCenter,
  type EyeCenterResult,
  type TimmBarthOptions,
} from "./pupil/timmBarth.js";
export { refinePupil, type PupilRefinement } from "./pupil/refinePupil.js";

export {
  OneEuroFilter,
  OneEuroFilter2D,
  type OneEuroOptions,
} from "./filter/oneEuro.js";
export { Kalman2D, type Kalman2DOptions } from "./filter/kalman.js";

export { ridgeRegression, solveLinearSystem, predict } from "./gaze/ridge.js";
export {
  GazeCalibrator,
  featureVector,
  type GazeFeatures,
  type CalibrationSample,
  type CalibrationResult,
} from "./gaze/calibration.js";

export { Camera, type CameraOptions } from "./media/camera.js";

export {
  eyeAspectRatio,
  LandmarkEyeRegionProvider,
  type EyeLandmarks,
  type LandmarkSource,
} from "./adapters/landmarks.js";

export {
  GazeTracker,
  type GazeTrackerOptions,
  type GazeFrame,
  type TrackedEye,
  type GazeListener,
} from "./track/tracker.js";
