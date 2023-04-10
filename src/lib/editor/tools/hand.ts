import { get } from "svelte/store";
import { MouseCursors } from "../../constants";
import type { AppState } from "../../state";
import type { Point } from "../../types";
import type { ToolStrategy } from "./types";

export class HandStrategy implements ToolStrategy {
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
