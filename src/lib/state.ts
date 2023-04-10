import { writable } from "svelte/store";
import { History } from "./history";
import { mouseCursors, toolCursors } from "./constants";
import type { Obj, Point, Tool } from "./types";

const zoom = writable(1);

const selected = writable(-1);

const viewport = writable({ x: 0, y: 0, width: 0, height: 0 });

const cursor = writable({
  type: mouseCursors.auto,
  position: { x: 0, y: 0 },
});

const activeTool = writable<Tool>("select");

const points = writable<Point[]>([]);

const objects = writable<Obj[]>([]);

const history = new History([points, objects]);

activeTool.subscribe((tool) =>
  cursor.update((cursor) => {
    cursor.type = toolCursors[tool];
    return cursor;
  })
);

export const appState = {
  zoom,
  cursor,
  viewport,
  selected,
  activeTool,
  points,
  objects,
  history,
};

export type AppState = typeof appState;
