import { describe, expect, it } from "vitest";
import { GazeTracker } from "../src/track/tracker.js";
import type { EyeRegionProvider } from "../src/detect/eyeRegions.js";
import { createGray, type GrayImage } from "../src/core/image.js";
import { drawCircle, syntheticEye } from "./helpers.js";

/** A frame with two synthetic eyes at known pupil positions. */
function twoEyeFrame(
  leftPupil: { x: number; y: number },
  rightPupil: { x: number; y: number }
): GrayImage {
  const img = createGray(320, 240);
  img.data.fill(190);
  drawCircle(img, leftPupil.x, leftPupil.y, 12, 120);
  drawCircle(img, leftPupil.x, leftPupil.y, 6, 12);
  drawCircle(img, rightPupil.x, rightPupil.y, 12, 120);
  drawCircle(img, rightPupil.x, rightPupil.y, 6, 12);
  return img;
}

const fixedProvider: EyeRegionProvider = {
  findEyes: () => [
    { rect: { x: 70, y: 80, width: 60, height: 40 }, side: "left", confidence: 1 },
    { rect: { x: 190, y: 80, width: 60, height: 40 }, side: "right", confidence: 1 },
  ],
};

describe("GazeTracker.processFrame (headless)", () => {
  it("tracks pupils inside provided eye regions", () => {
    const tracker = new GazeTracker({
      eyeRegionProvider: fixedProvider,
      smoothing: false,
    });
    const frame = tracker.processFrame(
      twoEyeFrame({ x: 100, y: 100 }, { x: 220, y: 100 })
    );
    expect(frame.eyes.length).toBe(2);
    const left = frame.eyes.find((e) => e.side === "left")!;
    const right = frame.eyes.find((e) => e.side === "right")!;
    expect(Math.hypot(left.pupil.x - 100, left.pupil.y - 100)).toBeLessThan(4);
    expect(Math.hypot(right.pupil.x - 220, right.pupil.y - 100)).toBeLessThan(4);
    expect(frame.blink).toBe(false);
    expect(frame.features?.left).toBeDefined();
    expect(frame.features?.right).toBeDefined();
    // Centered pupil -> normalized position near (0.5, 0.5), gaze vector ~0.
    expect(left.normalizedPupil.x).toBeGreaterThan(0.3);
    expect(left.normalizedPupil.x).toBeLessThan(0.7);
    expect(Math.abs(left.gazeVector.x)).toBeLessThan(6);
  });

  it("flags blinks on featureless eye regions", () => {
    const tracker = new GazeTracker({
      eyeRegionProvider: fixedProvider,
      smoothing: false,
    });
    const img = createGray(320, 240);
    img.data.fill(190); // eyelids closed: no pupil structure anywhere
    const frame = tracker.processFrame(img);
    expect(frame.blink).toBe(true);
    expect(frame.gazePoint).toBeNull();
  });

  it("produces calibrated gaze points end-to-end", () => {
    const tracker = new GazeTracker({
      eyeRegionProvider: fixedProvider,
      smoothing: false,
    });

    // Simulate a 9-point calibration: pupil position within the eye boxes
    // moves linearly with the target on a 1000x600 screen.
    const targets: Array<{ x: number; y: number }> = [];
    for (const tx of [100, 500, 900]) {
      for (const ty of [100, 300, 500]) {
        targets.push({ x: tx, y: ty });
      }
    }
    for (const target of targets) {
      const px = 80 + (target.x / 1000) * 40; // left eye box x: 70..130
      const py = 88 + (target.y / 600) * 24;
      const frame = tracker.processFrame(
        twoEyeFrame({ x: px, y: py }, { x: px + 120, y: py })
      );
      expect(frame.features).not.toBeNull();
      tracker.calibration.addSample(frame.features!, target);
    }
    const { meanError } = tracker.calibration.train();
    expect(meanError).toBeLessThan(120);

    // Look at the middle of the screen.
    const frame = tracker.processFrame(
      twoEyeFrame({ x: 100, y: 100 }, { x: 220, y: 100 })
    );
    expect(frame.gazePoint).not.toBeNull();
    expect(frame.gazePoint!.x).toBeGreaterThan(250);
    expect(frame.gazePoint!.x).toBeLessThan(750);
    expect(frame.gazePoint!.y).toBeGreaterThan(120);
    expect(frame.gazePoint!.y).toBeLessThan(480);
  });

  it("smooths pupil jitter when smoothing is enabled", () => {
    const tracker = new GazeTracker({
      eyeRegionProvider: fixedProvider,
      smoothing: { minCutoff: 0.5, beta: 0.001 },
    });
    // Feed alternating positions; smoothed output should move less than raw.
    let last: number | null = null;
    let maxJump = 0;
    for (let i = 0; i < 30; i++) {
      const jitter = i % 2 === 0 ? -2 : 2;
      const frame = tracker.processFrame(
        twoEyeFrame({ x: 100 + jitter, y: 100 }, { x: 220 + jitter, y: 100 })
      );
      const x = frame.eyes.find((e) => e.side === "left")!.pupil.x;
      if (last !== null && i > 10) maxJump = Math.max(maxJump, Math.abs(x - last));
      last = x;
    }
    expect(maxJump).toBeLessThan(2);
  });
});
