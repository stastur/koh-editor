import { get } from "svelte/store";
import { match } from "ts-pattern";
import type { AppState } from "../state";
import {
  clamp,
  divide,
  multiply,
  noop,
  roundPoint,
  subtract,
  toScene,
} from "../utils";
import type { Point } from "../types";
import type { ToolStrategy } from "./tools/types";

export class Editor {
  strategy!: ToolStrategy;

  constructor(private canvas: HTMLCanvasElement, private ctx: AppState) {}

  elementToCanvasCoords = (p: Point) =>
    toScene(p, this.canvas, this.canvas.getBoundingClientRect());

  onWheel = ({ deltaY }: WheelEvent) => {
    const { zoom, viewport, cursor } = this.ctx;

    zoom.update((zoom) => {
      const newZoom = Number((zoom + Math.sign(deltaY) * 1).toPrecision(2));
      return clamp(newZoom, 1, 8);
    });

    viewport.update((viewport) => {
      const cursorPos = get(cursor).position;
      const offset = subtract(multiply(cursorPos, get(zoom)), cursorPos);

      viewport.x = -offset.x;
      viewport.y = -offset.y;

      return viewport;
    });
  };

  onMouseDown = (event: MouseEvent) => {
    this.strategy.mouseDown?.(get(this.ctx.cursor).position, event);
  };

  onMouseUp = (event: MouseEvent) => {
    this.strategy.mouseUp?.(get(this.ctx.cursor).position, event);
  };

  onMouseMove = (event: MouseEvent) => {
    this.ctx.cursor.update((cursor) => {
      cursor.position = roundPoint(
        divide(
          subtract(
            this.elementToCanvasCoords({ x: event.offsetX, y: event.offsetY }),
            get(this.ctx.viewport)
          ),
          get(this.ctx.zoom)
        )
      );

      return cursor;
    });

    this.strategy.mouseMove?.(get(this.ctx.cursor).position, event);
  };

  onKeyDown = (event: KeyboardEvent) => {
    match(event)
      .with({ metaKey: true, shiftKey: true, key: "z" }, this.ctx.history.redo)
      .with({ metaKey: true, key: "z" }, this.ctx.history.undo)
      .otherwise(noop);

    this.strategy.keyDown?.(event);
  };
}
