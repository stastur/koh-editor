import { get } from "svelte/store";
import { appState, type AppState } from "./state";
import { MouseCursors } from "./constants";
import {
  clamp,
  distance,
  divide,
  isCloseToPolyline,
  multiply,
  noop,
  roundPoint,
  subtract,
  toScene,
} from "./utils";
import { deleteObject, newArcPoint, newPosition } from "./actions";
import type { Point, Tool } from "./types";
import { match, P } from "ts-pattern";

interface ToolStrategy {
  mouseUp?(cursor: Point, _event: MouseEvent): void;
  mouseDown?(cursor: Point, _event: MouseEvent): void;
  mouseMove?(cursor: Point, _event: MouseEvent): void;
  keyDown?(_event: KeyboardEvent): void;
}

class HandStrategy implements ToolStrategy {
  previousCursorPosition = { x: 0, y: 0 };

  constructor(private ctx: AppState) {}

  mouseMove(cursor: Point, event: MouseEvent) {
    if (get(this.ctx.cursor).type === MouseCursors.grab) {
      this.previousCursorPosition = cursor;
      return;
    }

    const delta = { x: event.movementX, y: event.movementY };

    this.ctx.viewport.update((viewport) => {
      viewport.x += delta.x;
      viewport.y += delta.y;
      return viewport;
    });

    this.previousCursorPosition = cursor;
  }

  mouseDown() {
    this.ctx.cursor.update((cursor) => {
      cursor.type = MouseCursors.grabbing;
      return cursor;
    });
  }

  mouseUp() {
    this.ctx.cursor.update((cursor) => {
      cursor.type = MouseCursors.grab;
      return cursor;
    });
  }
}

class ArcStrategy implements ToolStrategy {
  objIdx = -1;

  constructor(private ctx: AppState) {}

  mouseUp(cursor: Point): void {
    const { objects, history } = this.ctx;

    if (this.objIdx === -1) {
      objects.update((objects) => {
        this.objIdx = objects.length;
        objects.push({ type: "arc", points: [], properties: {} });
        return objects;
      });
    }

    newArcPoint(this.objIdx, cursor);

    const arc = get(objects)[this.objIdx];
    const first = arc.points.at(0);
    const last = arc.points.at(-1);

    if (arc.points.length > 2 && first === last) {
      this.objIdx = -1;
    }

    history.commit();
  }

  keyDown(event: KeyboardEvent): void {
    match(event)
      .with({ key: "Escape" }, () => {
        deleteObject(this.objIdx);
        this.objIdx = -1;
      })
      .otherwise(noop);
  }
}

class PositionStrategy implements ToolStrategy {
  constructor(private ctx: AppState) {}

  mouseUp(cursor: Point): void {
    newPosition(cursor);
    this.ctx.history.commit();
  }
}

class SelectStrategy implements ToolStrategy {
  hovered = -1;
  dragging = -1;

  constructor(private ctx: AppState) {}

  mouseMove(cursor: Point): void {
    const { objects, points } = this.ctx;

    const elementUnder = get(objects).findIndex((o) => {
      const coords = o.points.map((i) => get(points)[i]);

      if (o.type === "position") {
        return distance(cursor, coords[0]) < 5;
      }

      if (o.type === "arc") {
        return isCloseToPolyline(cursor, coords);
      }
    });

    this.hovered = elementUnder;

    this.ctx.cursor.update((cursor) => {
      cursor.type =
        this.hovered === -1 ? MouseCursors.auto : MouseCursors.pointer;
      return cursor;
    });

    if (this.dragging !== -1) {
      points.update((points) => {
        points[this.dragging] = cursor;
        return points;
      });
    }
  }

  mouseUp(): void {
    this.ctx.selected.set(this.hovered);

    if (this.dragging !== -1) {
      this.dragging = -1;
      this.ctx.history.commit();
    }
  }

  mouseDown(cursor: Point): void {
    const { objects, points } = this.ctx;
    const selected = get(this.ctx.selected);

    if (selected !== -1 && this.dragging === -1) {
      const selectedObj = get(objects)[selected];
      const draggingIndex = selectedObj.points.find(
        (i) => distance(get(points)[i], cursor) < 10
      );

      this.dragging = draggingIndex ?? -1;
    }
  }

  keyDown(event: KeyboardEvent): void {
    match(event)
      .with({ key: P.union("Delete", "Backspace") }, () => {
        const selected = get(this.ctx.selected);
        if (selected !== -1) {
          deleteObject(selected);
          this.ctx.history.commit();
        }
      })
      .otherwise(noop);
  }
}

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

export const strategies: Record<Tool, ToolStrategy> = {
  arc: new ArcStrategy(appState),
  position: new PositionStrategy(appState),
  select: new SelectStrategy(appState),
  hand: new HandStrategy(appState),
};
