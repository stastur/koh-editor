import { noop } from "svelte/internal";
import { get } from "svelte/store";
import { match } from "ts-pattern";
import { newArcPoint, deleteObject } from "../../actions";
import type { AppState } from "../../state";
import type { Point } from "../../types";
import type { ToolStrategy } from "./types";

export class ArcStrategy implements ToolStrategy {
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
