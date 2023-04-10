import type { Point } from "../../types";

export interface ToolStrategy {
  mouseUp?(cursor: Point, _event: MouseEvent): void;
  mouseDown?(cursor: Point, _event: MouseEvent): void;
  mouseMove?(cursor: Point, _event: MouseEvent): void;
  keyDown?(_event: KeyboardEvent): void;
}
