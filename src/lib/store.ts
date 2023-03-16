import { writable } from "svelte/store";

export type Point = { x: number; y: number };
export type Obj = {
  type: "arc" | "polygon" | "position";
  points: number[];
};

export const selection = writable<number>(-1);
export const points = writable<Point[]>([]);
export const objects = writable<Obj[]>([]);

export const activeShape = writable<Obj["type"]>("arc");

const _formatRef = {
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 20, y: 10 },
    { x: 30, y: 10 },
    { x: 40, y: 10 },
    { x: 40, y: 40 },
  ],
  objects: [
    { type: "arc", points: [0, 1, 2] },
    { type: "arc", points: [2, 3] },
    { type: "polygon", points: [0, 3, 5] },
    { type: "position", points: [4] },
  ],
};
