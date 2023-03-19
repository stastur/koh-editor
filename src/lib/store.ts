import { derived, writable } from "svelte/store";

export type Point = { x: number; y: number };

export type Obj = {
  type: "arc" | "position";
  points: number[];
  properties: Record<string, string>;
};

export const points = writable<Point[]>([]);
export const objects = writable<Obj[]>([]);

export type Tool = Obj["type"] | "select";
export const activeTool = writable<Tool>("select");

export const selection = writable(-1);
export const editingElement = writable(-1);
export const hoveredElement = writable(-1);

export const exportLink = derived([points, objects], ([$points, $objects]) => {
  const topology = { points: $points, objects: $objects };
  const json = JSON.stringify(topology, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  return URL.createObjectURL(blob);
});
