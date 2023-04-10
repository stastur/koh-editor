import type { Tool } from "./types";

export const mouseButtons = {
  main: 0,
  wheel: 1,
  secondary: 2,
};

export const mouseCursors = {
  move: "move",
  grab: "grab",
  pointer: "pointer",
  grabbing: "grabbing",
  crosshair: "crosshair",
  auto: "",
};

export const toolCursors: Record<Tool, string> = {
  arc: mouseCursors.crosshair,
  hand: mouseCursors.grab,
  select: mouseCursors.auto,
  position: mouseCursors.crosshair,
};
