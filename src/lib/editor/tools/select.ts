import { get } from "svelte/store";
import { match, P } from "ts-pattern";
import { deleteObject } from "../../actions";
import { MouseCursors } from "../../constants";
import type { AppState } from "../../state";
import type { Point } from "../../types";
import { distance, isCloseToPolyline, noop } from "../../utils";
import type { ToolStrategy } from "./types";

export class SelectStrategy implements ToolStrategy {
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
