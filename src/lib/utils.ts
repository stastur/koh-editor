import type { Point } from "./store";
import type { Point as RoughPoint } from "roughjs/bin/geometry";

type Line = [Point, Point];

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), max);
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
