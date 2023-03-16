import type { Point } from "./store";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), max);
}

export function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}
