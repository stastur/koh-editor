import { derived, writable } from "svelte/store";
import { History } from "./history";
import { mouseCursors, toolCursors } from "./constants";
import type { Obj, Point, Tool } from "./types";

export const zoom = writable(1);

export const selected = writable(-1);

export const viewport = writable({ x: 0, y: 0, width: 0, height: 0 });

export const cursor = writable({
  type: mouseCursors.auto,
  position: { x: 0, y: 0 },
});

export const activeTool = writable<Tool>("select");

export const points = writable<Point[]>([]);

export const objects = writable<Obj[]>([]);

export const history = new History([points, objects]);

activeTool.subscribe((tool) =>
  cursor.update((cursor) => {
    cursor.type = toolCursors[tool];
    return cursor;
  })
);

export const exportLink = derived([points, objects], ([$points, $objects]) => {
  const topology = { points: $points, objects: $objects };
  const json = JSON.stringify(topology, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  return URL.createObjectURL(blob);
});
