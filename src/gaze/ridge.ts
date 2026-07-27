/**
 * Ridge (Tikhonov-regularized least squares) regression, solved in closed
 * form via Gaussian elimination on the normal equations. Feature counts here
 * are tiny (<= 10), so numerical sophistication beyond partial pivoting is
 * unnecessary.
 */

/** Solve A w = b for square A (n x n, row-major) with partial pivoting. */
export function solveLinearSystem(A: Float64Array, b: Float64Array, n: number): Float64Array {
  // Augmented in-place elimination on copies.
  const M = A.slice();
  const y = b.slice();
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r * n + col]) > Math.abs(M[pivot * n + col])) pivot = r;
    }
    if (pivot !== col) {
      for (let c = 0; c < n; c++) {
        const t = M[col * n + c];
        M[col * n + c] = M[pivot * n + c];
        M[pivot * n + c] = t;
      }
      const t = y[col];
      y[col] = y[pivot];
      y[pivot] = t;
    }
    const p = M[col * n + col];
    if (Math.abs(p) < 1e-12) throw new Error("Singular system in ridge solve");
    for (let r = col + 1; r < n; r++) {
      const f = M[r * n + col] / p;
      if (f === 0) continue;
      for (let c = col; c < n; c++) M[r * n + c] -= f * M[col * n + c];
      y[r] -= f * y[col];
    }
  }
  const w = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let acc = y[r];
    for (let c = r + 1; c < n; c++) acc -= M[r * n + c] * w[c];
    w[r] = acc / M[r * n + r];
  }
  return w;
}

/**
 * Fit w = argmin ||X w - t||^2 + lambda ||w||^2 where X is m x n (row-major,
 * one sample per row). The intercept, if desired, should be an explicit
 * all-ones feature column (and is regularized like everything else — fine at
 * the small lambdas used here).
 */
export function ridgeRegression(
  X: number[][],
  t: number[],
  lambda = 1e-5
): Float64Array {
  const m = X.length;
  if (m === 0) throw new Error("No training samples");
  const n = X[0].length;
  const XtX = new Float64Array(n * n);
  const Xtt = new Float64Array(n);
  for (let i = 0; i < m; i++) {
    const row = X[i];
    for (let a = 0; a < n; a++) {
      Xtt[a] += row[a] * t[i];
      for (let b = a; b < n; b++) {
        XtX[a * n + b] += row[a] * row[b];
      }
    }
  }
  // Mirror the upper triangle and add the ridge.
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < a; b++) XtX[a * n + b] = XtX[b * n + a];
    XtX[a * n + a] += lambda;
  }
  return solveLinearSystem(XtX, Xtt, n);
}

export function predict(w: ArrayLike<number>, features: number[]): number {
  let acc = 0;
  for (let i = 0; i < features.length; i++) acc += w[i] * features[i];
  return acc;
}
