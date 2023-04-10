import { newPosition } from "../../actions";
import type { AppState } from "../../state";
import type { Point } from "../../types";
import type { ToolStrategy } from "./types";

export class PositionStrategy implements ToolStrategy {
  constructor(private ctx: AppState) {}

  mouseUp(cursor: Point): void {
    newPosition(cursor);
    this.ctx.history.commit();
  }
}
