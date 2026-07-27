import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decode } from "jpeg-js";
import { describe, expect, it } from "vitest";
import { toGrayscale } from "../src/core/image.js";
import { HaarDetector } from "../src/detect/haar.js";
import { frontalFaceCascade } from "../src/detect/cascades/frontalface.js";
import { HaarEyeRegionProvider } from "../src/detect/eyeRegions.js";
import { eyeCascade } from "../src/detect/cascades/eye.js";
import { GazeTracker } from "../src/track/tracker.js";

// A real webcam frame from the original 2013 REU paper (paper/figs). The
// subject's face fills the middle of a 673x376 frame with a black border.
const jpg = decode(
  readFileSync(
    fileURLToPath(new URL("../paper/figs/fullFaceGaze.jpg", import.meta.url))
  ),
  { useTArray: true }
);
const gray = toGrayscale({
  width: jpg.width,
  height: jpg.height,
  data: new Uint8ClampedArray(jpg.data),
});

describe("real-image pipeline", () => {
  it("detects the face with the ported Viola-Jones detector", () => {
    const detector = new HaarDetector(frontalFaceCascade);
    const faces = detector.detect(gray, { minNeighbors: 2 });
    expect(faces.length).toBeGreaterThan(0);
    const face = faces.reduce((a, b) =>
      a.width * a.height >= b.width * b.height ? a : b
    );
    // The face occupies roughly the central third of the frame.
    const cx = face.x + face.width / 2;
    const cy = face.y + face.height / 2;
    expect(cx).toBeGreaterThan(jpg.width * 0.3);
    expect(cx).toBeLessThan(jpg.width * 0.7);
    expect(cy).toBeGreaterThan(jpg.height * 0.2);
    expect(cy).toBeLessThan(jpg.height * 0.8);
  });

  it("finds two labeled eye regions inside the face band", () => {
    const provider = new HaarEyeRegionProvider(eyeCascade, frontalFaceCascade);
    const eyes = provider.findEyes(gray);
    expect(eyes.length).toBe(2);
    expect(eyes[0].side).toBe("left");
    expect(eyes[1].side).toBe("right");
    // Eyes sit in the upper half of the frame, left of/right of center.
    for (const eye of eyes) {
      const cy = eye.rect.y + eye.rect.height / 2;
      expect(cy).toBeGreaterThan(jpg.height * 0.25);
      expect(cy).toBeLessThan(jpg.height * 0.65);
    }
    const lx = eyes[0].rect.x + eyes[0].rect.width / 2;
    const rx = eyes[1].rect.x + eyes[1].rect.width / 2;
    expect(rx - lx).toBeGreaterThan(40); // plausible interocular distance
  });

  it("localizes pupils with usable confidence via the full tracker", () => {
    const tracker = new GazeTracker({ smoothing: false });
    const frame = tracker.processFrame(gray);
    expect(frame.eyes.length).toBe(2);
    expect(frame.blink).toBe(false);
    for (const eye of frame.eyes) {
      // Pupil must land inside its eye box with real confidence.
      expect(eye.pupil.x).toBeGreaterThan(eye.rect.x);
      expect(eye.pupil.x).toBeLessThan(eye.rect.x + eye.rect.width);
      expect(eye.pupil.y).toBeGreaterThan(eye.rect.y);
      expect(eye.pupil.y).toBeLessThan(eye.rect.y + eye.rect.height);
      expect(eye.confidence).toBeGreaterThan(0.05);
    }
    expect(frame.features?.left).toBeDefined();
    expect(frame.features?.right).toBeDefined();
  });
});
