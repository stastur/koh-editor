import type { Tool } from "./types";

export const MouseButtons = {
  main: 0,
  wheel: 1,
  secondary: 2,
};

export const MouseCursors = {
  move: "move",
  grab: "grab",
  pointer: "pointer",
  grabbing: "grabbing",
  crosshair: "crosshair",
  auto: "",
};

export const ToolCursors: Record<Tool, string> = {
  arc: MouseCursors.crosshair,
  hand: MouseCursors.grab,
  select: MouseCursors.auto,
  position: MouseCursors.crosshair,
};
