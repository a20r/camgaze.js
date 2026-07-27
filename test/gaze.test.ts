import { describe, expect, it } from "vitest";
import { ridgeRegression, predict, solveLinearSystem } from "../src/gaze/ridge.js";
import { GazeCalibrator } from "../src/gaze/calibration.js";

describe("solveLinearSystem", () => {
  it("solves a well-conditioned 3x3 system", () => {
    // A = [[2,1,0],[1,3,1],[0,1,4]], x = [1,-2,3] -> b = [0,-2,10]
    const A = Float64Array.from([2, 1, 0, 1, 3, 1, 0, 1, 4]);
    const b = Float64Array.from([0, -2, 10]);
    const x = solveLinearSystem(A, b, 3);
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(-2, 8);
    expect(x[2]).toBeCloseTo(3, 8);
  });
});

describe("ridgeRegression", () => {
  it("recovers a linear map with negligible regularization", () => {
    // t = 3a - 2b + 5 with feature vector [a, b, 1]
    const X: number[][] = [];
    const t: number[] = [];
    for (let a = 0; a <= 4; a++) {
      for (let b = 0; b <= 4; b++) {
        X.push([a, b, 1]);
        t.push(3 * a - 2 * b + 5);
      }
    }
    const w = ridgeRegression(X, t, 1e-9);
    expect(w[0]).toBeCloseTo(3, 4);
    expect(w[1]).toBeCloseTo(-2, 4);
    expect(w[2]).toBeCloseTo(5, 4);
    expect(predict(w, [2, 1, 1])).toBeCloseTo(9, 4);
  });
});

describe("GazeCalibrator", () => {
  // Synthetic subject: gaze point is an affine function of pupil position.
  const screenFromPupil = (nx: number, ny: number) => ({
    x: 1200 * nx + 40,
    y: 800 * ny - 30,
  });

  it("learns a 9-point calibration and generalizes", () => {
    const cal = new GazeCalibrator();
    for (const gx of [0.2, 0.5, 0.8]) {
      for (const gy of [0.25, 0.5, 0.75]) {
        // Several noisy samples per target, slight eye asymmetry.
        for (let s = 0; s < 5; s++) {
          const jitter = () => (Math.sin(gx * 31 + gy * 17 + s) * 0.004);
          cal.addSample(
            {
              left: { x: gx + jitter(), y: gy + jitter() },
              right: { x: gx + 0.01 + jitter(), y: gy - 0.005 + jitter() },
            },
            screenFromPupil(gx, gy)
          );
        }
      }
    }
    const { meanError } = cal.train();
    expect(meanError).toBeLessThan(15);

    const est = cal.estimate({
      left: { x: 0.65, y: 0.4 },
      right: { x: 0.66, y: 0.395 },
    });
    const truth = screenFromPupil(0.65, 0.4);
    expect(est).not.toBeNull();
    expect(Math.hypot(est!.x - truth.x, est!.y - truth.y)).toBeLessThan(30);
  });

  it("falls back gracefully to a single eye", () => {
    const cal = new GazeCalibrator();
    for (const gx of [0.2, 0.5, 0.8]) {
      for (const gy of [0.2, 0.5, 0.8]) {
        cal.addSample(
          { left: { x: gx, y: gy }, right: { x: gx, y: gy } },
          screenFromPupil(gx, gy)
        );
      }
    }
    cal.train();
    const est = cal.estimate({ left: { x: 0.5, y: 0.5 } });
    const truth = screenFromPupil(0.5, 0.5);
    expect(est).not.toBeNull();
    expect(Math.hypot(est!.x - truth.x, est!.y - truth.y)).toBeLessThan(40);
  });

  it("refuses to train on too few samples", () => {
    const cal = new GazeCalibrator();
    cal.addSample({ left: { x: 0.5, y: 0.5 } }, { x: 0, y: 0 });
    expect(() => cal.train()).toThrow();
  });

  it("estimate returns null before training", () => {
    const cal = new GazeCalibrator();
    expect(cal.estimate({ left: { x: 0.5, y: 0.5 } })).toBeNull();
  });
});
