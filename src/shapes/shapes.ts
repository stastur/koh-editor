import type { Options, Point } from "../canvas/types";

export interface Shape {
  options: Options;
}

export class Position implements Shape {
  constructor(
    public point: Point,
    public options: Options = {},
  ) {}
}

export class Polyline implements Shape {
  constructor(
    public points: Point[],
    public options: Options = {},
  ) {}
}
