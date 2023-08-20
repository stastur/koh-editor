export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Options {
  fill?: string;
  fillStyle?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface Canvas {
  line(x1: number, y1: number, x2: number, y2: number, options?: Options): void;

  rectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: Options,
  ): void;

  ellipse(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: Options,
  ): void;

  circle(x: number, y: number, diameter: number, options?: Options): void;

  linearPath(points: Point[], options?: Options): void;

  polygon(points: Point[], options?: Options): void;

  arc(
    x: number,
    y: number,
    width: number,
    height: number,
    start: number,
    stop: number,
    closed?: boolean,
    options?: Options,
  ): void;

  curve(points: Point[], options?: Options): void;

  path(d: string, options?: Options): void;
}

export interface Viewport {
  size: Size;
  scale: number;
  position: Point;
}
