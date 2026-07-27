# camgaze.js

Webcam eye tracking and gaze estimation in the browser — visible light, no
special hardware, **zero runtime dependencies**.

camgaze started life in 2013 as an NSF REU internship project. Version 2 is a
ground-up modernization: an ES-module TypeScript library with tests and typed
APIs, and a tracking pipeline rebuilt on algorithms from the eye-tracking
literature that postdate the original.

## Install

```sh
npm install camgaze
```

Or drop the single-file build into a page (exposes a global `camgaze`):

```html
<script src="dist/camgaze.min.js"></script>
```

## Quick start

```js
import { GazeTracker } from "camgaze";

const tracker = new GazeTracker();
tracker.on("gaze", (frame) => {
  for (const eye of frame.eyes) {
    console.log(eye.side, eye.pupil, eye.confidence, eye.gazeVector);
  }
  if (frame.gazePoint) {
    // Screen-space gaze estimate (after calibration)
    moveCursor(frame.gazePoint.x, frame.gazePoint.y);
  }
});
await tracker.start(); // asks for camera permission
```

### Calibration

Uncalibrated, each eye reports a **gaze vector** (pupil displacement from the
eye-region center — the same signal camgaze v1 exposed). To get actual screen
coordinates, run a short calibration: show the user a handful of dots, and while
they fixate each dot, record samples:

```js
// For each of ~9 dots at known page coordinates (x, y):
tracker.addCalibrationPoint({ x, y }); // call several times per dot

// After all dots:
const { meanError } = tracker.calibration.train();

// From now on frame.gazePoint is populated.
```

`examples/index.html` is a complete working demo with a 9-point calibration
flow — build first (`npm run build`), then serve the repo root
(`npx serve .`) and open `/examples/` over `http://localhost` (camera access
requires a secure context).

## The pipeline (what's new in v2)

| Stage | v1 (2013) | v2 |
|---|---|---|
| Camera | `navigator.getUserMedia` + `URL.createObjectURL(stream)` (both removed from browsers) | `navigator.mediaDevices.getUserMedia`, `srcObject`, `requestVideoFrameCallback`, `OffscreenCanvas` |
| Eye regions | Haar eye cascade over the whole frame (jsfeat) | Dependency-free Viola–Jones port, **face-gated**: eyes are searched only in the eye band of the detected face; pluggable providers for landmark models |
| Pupil localization | Brute-force intensity-threshold sweep (fixed 10–30 gray window) + connected components | **Gradient-alignment eye-center localization** (Timm & Barth 2011) with darkness weighting, plus adaptive percentile dark-blob refinement inspired by ElSe (Fuhl et al. 2016) |
| Smoothing | Fixed-length moving average | **One Euro filter** (Casiez et al., CHI 2012); constant-velocity **Kalman** filter also included |
| Gaze mapping | Raw pixel offset, no calibration | **Ridge-regression calibration** to screen coordinates (the approach popularized by WebGazer, Papoutsaki et al. 2016), robust to one-eye dropouts |
| Blink handling | None (pupils jumped during blinks) | Confidence from the gradient objective collapses during blinks → `frame.blink`; EAR helper (Soukupová & Čech 2016) for landmark users |
| Packaging | Global namespace, built with `cat js/* > build/camgaze.js` | TypeScript, ESM + minified IIFE builds, `.d.ts` types, vitest suite, tree-shakeable exports |

### Using your own face-landmark model

If your app already runs MediaPipe FaceLandmarker (or any model that yields
eye contours), skip the Haar cascades entirely — you'll get tighter boxes and
free blink detection:

```js
import { GazeTracker, LandmarkEyeRegionProvider } from "camgaze";

let latestLandmarks = null; // update from your model each frame

const tracker = new GazeTracker({
  eyeRegionProvider: new LandmarkEyeRegionProvider(() => latestLandmarks),
});
```

### Low-level building blocks

Everything the tracker uses is exported and usable standalone:

```js
import {
  HaarDetector, eyeCascade, frontalFaceCascade, // Viola–Jones
  locateEyeCenter, refinePupil,                 // pupil localization
  OneEuroFilter2D, Kalman2D,                    // smoothing
  GazeCalibrator, ridgeRegression,              // calibration
  toGrayscale, resizeGray, equalizeHistogram,   // image ops
  eyeAspectRatio,                               // blink detection (EAR)
} from "camgaze";
```

All vision routines operate on plain `{ width, height, data }` structs, so
they run in workers and Node (the test suite runs entirely headless).

## Development

```sh
npm install
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run build       # dist/ (ESM + dist/camgaze.min.js IIFE)
npm run cascades    # regenerate src/detect/cascades/ from legacy/cascades/
```

## References

- F. Timm, E. Barth. *Accurate Eye Centre Localisation by Means of Gradients.* VISAPP 2011.
- G. Casiez, N. Roussel, D. Vogel. *1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems.* CHI 2012.
- W. Fuhl, T. Santini, T. Kübler, E. Kasneci. *ElSe: Ellipse Selection for Robust Pupil Detection in Real-World Environments.* ETRA 2016.
- A. Papoutsaki, P. Sangkloy, J. Laskey, N. Daskalova, J. Huang, J. Hays. *WebGazer: Scalable Webcam Eye Tracking Using User Interactions.* IJCAI 2016.
- T. Soukupová, J. Čech. *Real-Time Eye Blink Detection using Facial Landmarks.* CVWW 2016.
- P. Viola, M. Jones. *Rapid Object Detection using a Boosted Cascade of Simple Features.* CVPR 2001. (Cascade data derived from [js-objectdetect](https://github.com/mtschirs/js-objectdetect) / OpenCV.)

## Legacy

The original 2013 implementation — including the REU paper and presentations —
is preserved untouched under [`legacy/`](legacy/) (and `paper/`,
`presentations/`).
