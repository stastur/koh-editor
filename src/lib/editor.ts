import { get, writable } from "svelte/store";
import { state, type Point, type Tool, activeTool } from "./store";
import { CursorType } from "./constants";
import {
  clamp,
  distance,
  divide,
  isCloseToPolyline,
  multiply,
  roundPoint,
  subtract,
  toScene,
} from "./utils";
import { newArcPoint, newPosition } from "./actions";

export const zoom = writable(1);
export const selected = writable(-1);
export const viewport = writable({ x: 0, y: 0, width: 0, height: 0 });

export const cursor = writable({
  type: CursorType.auto,
  position: { x: 0, y: 0 },
});

const cursorsForTool: Record<Tool, string> = {
  arc: CursorType.crosshair,
  hand: CursorType.grab,
  select: CursorType.auto,
  position: CursorType.crosshair,
};

activeTool.subscribe((tool) =>
  cursor.update((cursor) => {
    cursor.type = cursorsForTool[tool];
    return cursor;
  })
);

export const context = {
  zoom,
  cursor,
  viewport,
  selected,
};

interface ToolStrategy {
  mouseUp?(cursor: Point, _event: MouseEvent): void;
  mouseDown?(cursor: Point, _event: MouseEvent): void;
  mouseMove?(cursor: Point, _event: MouseEvent): void;
  keyDown?(_event: KeyboardEvent): void;
}

class HandStrategy implements ToolStrategy {
  previousCursorPosition = { x: 0, y: 0 };

  constructor(private ctx: typeof context) {}

  mouseMove(cursor: Point, event: MouseEvent) {
    if (get(this.ctx.cursor).type === CursorType.grab) {
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
      cursor.type = CursorType.grabbing;
      return cursor;
    });
  }

  mouseUp() {
    this.ctx.cursor.update((cursor) => {
      cursor.type = CursorType.grab;
      return cursor;
    });
  }
}

class ArcStrategy implements ToolStrategy {
  objIdx = -1;

  constructor(private ctx: typeof context) {}

  mouseUp(cursor: Point): void {
    if (this.objIdx === -1) {
      state.update(({ objects }) => {
        this.objIdx = objects.length;
        objects.push({ type: "arc", points: [], properties: {} });
      });
    }

    newArcPoint(this.objIdx, cursor);

    state.update(({ objects }) => {
      const arc = objects[this.objIdx];
      const first = arc.points.at(0);
      const last = arc.points.at(-1);

      if (arc.points.length > 2 && first === last) {
        this.objIdx = -1;
      }
    });

    state.commit();
  }
}

class PositionStrategy implements ToolStrategy {
  constructor(private ctx: typeof context) {}

  mouseUp(cursor: Point): void {
    newPosition(cursor);
    state.commit();
  }
}

class SelectStrategy implements ToolStrategy {
  hovered = -1;
  dragging = -1;

  constructor(private ctx: typeof context) {}

  mouseMove(cursor: Point): void {
    const { objects, points } = get(state);

    const elementUnder = objects.findIndex((o) => {
      const coords = o.points.map((i) => points[i]);

      if (o.type === "position") {
        return distance(cursor, coords[0]) < 5;
      }

      if (o.type === "arc") {
        return isCloseToPolyline(cursor, coords);
      }
    });

    this.hovered = elementUnder;

    this.ctx.cursor.update((cursor) => {
      cursor.type = this.hovered === -1 ? CursorType.auto : CursorType.pointer;
      return cursor;
    });

    if (this.dragging !== -1) {
      state.update(({ points }) => (points[this.dragging] = cursor));
    }
  }

  mouseUp(): void {
    this.ctx.selected.set(this.hovered);

    if (this.dragging !== -1) {
      this.dragging = -1;
      state.commit();
    }
  }

  mouseDown(cursor: Point): void {
    const { objects, points } = get(state);
    const selected = get(this.ctx.selected);

    if (selected !== -1 && this.dragging === -1) {
      const selectedObj = objects[selected];
      const draggingIndex = selectedObj.points.find(
        (i) => distance(points[i], cursor) < 10
      );

      this.dragging = draggingIndex ?? -1;
    }
  }
}

export class Editor {
  strategy!: ToolStrategy;

  constructor(private canvas: HTMLCanvasElement, private ctx: typeof context) {}

  elementToCanvasCoords = (p: Point) =>
    toScene(p, this.canvas, this.canvas.getBoundingClientRect());

  onWheel = ({ deltaY }: WheelEvent) => {
    this.ctx.zoom.update((zoom) => {
      const newZoom = Number((zoom + Math.sign(deltaY) * 1).toPrecision(2));
      return clamp(newZoom, 1, 8);
    });

    this.ctx.viewport.update((viewport) => {
      const cursor = get(this.ctx.cursor).position;
      const offset = subtract(multiply(cursor, get(zoom)), cursor);

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
            get(viewport)
          ),
          get(zoom)
        )
      );

      return cursor;
    });

    this.strategy.mouseMove?.(get(this.ctx.cursor).position, event);
  };

  onKeyDown = (event: KeyboardEvent) => {
    this.strategy.keyDown?.(event);
  };
}

export const strategies: Record<Tool, ToolStrategy> = {
  arc: new ArcStrategy(context),
  position: new PositionStrategy(context),
  select: new SelectStrategy(context),
  hand: new HandStrategy(context),
};
