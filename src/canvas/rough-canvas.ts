import rough from "roughjs";
import type * as rCanvas from "roughjs/bin/canvas";
import type * as rCore from "roughjs/bin/core";
import type { Canvas, Options, Point } from "./types";

export class RoughCanvas implements Canvas {
  rc: rCanvas.RoughCanvas;

  constructor(canvas: HTMLCanvasElement, config?: rCore.Config) {
    this.rc = rough.canvas(canvas, config);
  }

  private toRoughOptions(options?: Options): rCore.Options {
    return {
      stroke: options?.stroke,
      strokeWidth: options?.strokeWidth,
      fill: options?.fill,
      fillStyle: options?.fillStyle,
    };
  }

  private toRoughPoint(point: Point): [number, number] {
    return [point.x, point.y];
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: Options,
  ): void {
    this.rc.line(x1, y1, x2, y2, this.toRoughOptions(options));
  }

  rectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: Options,
  ): void {
    this.rc.rectangle(x, y, width, height, this.toRoughOptions(options));
  }

  ellipse(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: Options,
  ): void {
    this.rc.ellipse(x, y, width, height, this.toRoughOptions(options));
  }

  circle(x: number, y: number, diameter: number, options?: Options): void {
    this.rc.circle(x, y, diameter, this.toRoughOptions(options));
  }

  linearPath(points: Point[], options?: Options): void {
    this.rc.linearPath(
      points.map((p) => this.toRoughPoint(p)),
      this.toRoughOptions(options),
    );
  }

  polygon(points: Point[], options?: Options): void {
    this.rc.polygon(
      points.map((p) => this.toRoughPoint(p)),
      this.toRoughOptions(options),
    );
  }

  arc(
    x: number,
    y: number,
    width: number,
    height: number,
    start: number,
    stop: number,
    closed?: boolean | undefined,
    options?: Options,
  ): void {
    this.rc.arc(
      x,
      y,
      width,
      height,
      start,
      stop,
      closed,
      this.toRoughOptions(options),
    );
  }

  curve(points: Point[], options?: Options): void {
    this.rc.curve(
      points.map((p) => this.toRoughPoint(p)),
      this.toRoughOptions(options),
    );
  }

  path(d: string, options?: Options): void {
    this.rc.path(d, this.toRoughOptions(options));
  }
}
