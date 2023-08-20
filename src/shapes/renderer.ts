import { P, match } from "ts-pattern";
import type { Canvas, Point, Viewport } from "../canvas/types";
import { Polyline, Position, type Shape } from "./shapes";

export class Renderer {
  constructor(
    public viewport: Viewport,
    public canvas: Canvas,
  ) {}

  isInViewport(point: Point): boolean {
    const { position, size } = this.viewport;
    const { x, y } = this.toViewport(point);

    return (
      x >= position.x &&
      x <= position.x + size.width &&
      y >= position.y &&
      y <= position.y + size.height
    );
  }

  toViewport = (point: Point): Point => {
    const { position, scale } = this.viewport;

    return {
      x: (point.x - position.x) * scale,
      y: (point.y - position.y) * scale,
    };
  };

  render(shape: Shape) {
    match(shape)
      .with(P.instanceOf(Position), (shape) => this.renderPosition(shape))
      .with(P.instanceOf(Polyline), (shape) => this.renderPolyline(shape))
      .otherwise(() => {});
  }

  renderPosition(shape: Position) {
    const { point, options } = shape;

    this.isInViewport(point) &&
      this.canvas.circle(
        this.toViewport(point).x,
        this.toViewport(point).y,
        5,
        options,
      );
  }

  renderPolyline(shape: Polyline) {
    const { points, options } = shape;

    points.some((point) => this.isInViewport(point)) &&
      this.canvas.linearPath(points.map(this.toViewport), options);
  }
}
