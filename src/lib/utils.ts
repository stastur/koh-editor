import type { Point } from "./store";
import type { Point as RoughPoint } from "roughjs/bin/geometry";

type Line = [Point, Point];

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), max);
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function multiply(p: Point, f: number): Point {
  return { x: p.x * f, y: p.y * f };
}

export function divide(p: Point, f: number): Point {
  return multiply(p, 1 / f);
}

export function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function angle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function angleBetweenLines(l1: Line, l2: Line) {
  return angle(...l1) - angle(...l2);
}

// y = ax + b
export function closestLinePoint(p: Point, l: Line) {
  const [start, end] = l;
  const al = (end.y - start.y) / (end.x - start.x);
  const bl = start.y - al * start.x;

  const a = -1 / al;
  const b = p.y - a * p.x;

  const x = (b - bl) / (al - a);
  const y = a * p.x + b;

  if (
    x >= Math.min(start.x, end.x) &&
    x <= Math.max(start.x, end.x) &&
    y >= Math.min(start.y, end.y) &&
    y <= Math.max(start.y, end.y)
  ) {
    return { x, y };
  } else {
    const d1 = distance(p, start);
    const d2 = distance(p, end);

    return d1 < d2 ? start : end;
  }
}

export function distanceToLine(p: Point, line: Line) {
  return distance(p, closestLinePoint(p, line));
}

export function isCloseToPolyline(p: Point, polyline: Point[], delta = 5) {
  if (polyline.length < 2) {
    return false;
  }

  for (let i = 0; i < polyline.length - 1; i++) {
    const segment: Line = [polyline[i], polyline[i + 1]];

    if (distanceToLine(p, segment) < delta) {
      return true;
    }
  }

  return false;
}

export function toTuple({ x, y }: Point) {
  return [x, y] satisfies RoughPoint;
}

export function middlePoint(l: Line) {
  const [s, e] = l;

  const x = s.x + 0.5 * (e.x - s.x);
  const y = s.y + 0.5 * (e.y - s.y);

  return { x, y };
}

export function distortLine(l: Line, options = { minDistance: 10 }): Point[] {
  const [s, e] = l;

  if (distance(s, e) < options.minDistance) {
    return l;
  }

  const middle = middlePoint(l);

  middle.x += Math.random() * 5 - 5;
  middle.y += Math.random() * 5 - 5;

  return [
    ...distortLine([s, middle], options),
    ...distortLine([middle, e], options).slice(1),
  ];
}

export function adjacentChunks<T>(arr: T[], size: number) {
  const result: T[][] = [];

  for (let i = 0; i < arr.length - size; i += size - 1) {
    result.push(arr.slice(i, i + size));
  }

  result.push(arr.slice(result.length * (size - 1)));

  return result;
}

export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

export function toScene(
  p: Point,
  target: { width: number; height: number },
  source: { width: number; height: number }
) {
  const projection = { ...p };

  projection.x *= target.width / source.width;
  projection.y *= target.height / source.height;

  return projection;
}

export function roundPoint({ x, y }: Point) {
  return { x: Math.floor(x), y: Math.floor(y) };
}
