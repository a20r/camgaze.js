/** A 2D point or vector. Plain object so it serializes and spreads cleanly. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function magnitude(p: Point): number {
  return Math.hypot(p.x, p.y);
}

export function rectCenter(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function rectContains(r: Rect, p: Point): boolean {
  return (
    p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height
  );
}

/** Intersection-over-union of two rectangles; 0 when disjoint. */
export function iou(a: Rect, b: Rect): number {
  const ix = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  );
  const iy = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  );
  const inter = ix * iy;
  if (inter === 0) return 0;
  return inter / (a.width * a.height + b.width * b.height - inter);
}

/** Intersect a rectangle with a width x height frame. */
export function clampRect(r: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(r.x, width));
  const y = Math.max(0, Math.min(r.y, height));
  const right = Math.max(x, Math.min(r.x + Math.max(0, r.width), width));
  const bottom = Math.max(y, Math.min(r.y + Math.max(0, r.height), height));
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}
