import { writable } from "svelte/store";
import type { Options, Point } from "../canvas/types";
import type { Path, Position, Storage } from "./storage";
import { createPoint } from "./utils";

export class Circle implements Position {
  constructor(
    public point: number,
    public options: Options = {},
  ) {}
}

export class Polyline implements Path {
  constructor(
    public points: number[],
    public options: Options = {},
  ) {}
}

type Shape = Circle | Polyline;

export function createShapesStorage() {
  const store = writable<Storage<Shape>>({
    points: [],
    objects: [],
  });

  function addPosition(point: Point, options: Options) {
    store.update(($) => {
      const index = $.points.push(createPoint(point.x, point.y)) - 1;
      const position = new Circle(index, options);
      $.objects.push(position);

      return $;
    });
  }

  function addPolyline(points: Point[], options: Options) {
    store.update(($) => {
      const indices = points.map(
        (point) => $.points.push(createPoint(point.x, point.y)) - 1,
      );
      const polyline = new Polyline(indices, options);
      $.objects.push(polyline);

      return $;
    });
  }

  return {
    subscribe: store.subscribe,
    update: store.update,
    set: store.set,

    addPosition,
    addPolyline,
  };
}

export type ShapesStore = ReturnType<typeof createShapesStorage>;
