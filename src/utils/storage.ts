import type { Shape } from "../shapes/shapes";

export interface ShapeStorage {
  shapes: Shape[];

  add(shape: Shape): void;
  remove(shape: Shape): void;
  clear(): void;
}
