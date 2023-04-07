import { derived, get, writable } from "svelte/store";

export type Point = { x: number; y: number };

export type Obj = {
  type: "arc" | "position";
  points: number[];
  properties: Record<string, string>;
};

export const points = writable<Point[]>([]);
export const objects = writable<Obj[]>([]);

export type Tool = Obj["type"] | "select" | "hand";
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

class History<T> {
  stack = [] as T[];
  index = -1;

  state = writable({ last: true, first: true });

  constructor(
    private takeSnapshot: () => T,
    private apply: (value: T) => void
  ) {
    this.index = 0;
    this.stack.push(structuredClone(this.takeSnapshot()));
    this.state.set({ last: true, first: true });
  }

  subscribe = this.state.subscribe;

  #update() {
    this.state.set({
      last: this.index === this.stack.length - 1,
      first: this.index === 0,
    });
  }

  push(fn: () => void) {
    fn();
    const snapshot: T = structuredClone(this.takeSnapshot());
    this.stack.length = ++this.index;
    this.stack.push(snapshot);
    this.#update();
  }

  current() {
    return this.stack[this.index];
  }

  undo() {
    this.index = Math.max(0, this.index - 1);
    this.apply(this.current());
    this.#update();
  }

  redo() {
    this.index = Math.min(this.stack.length - 1, this.index + 1);
    this.apply(this.current());
    this.#update();
  }
}

export const changes = new History(
  () => ({
    points: get(points),
    objects: get(objects),
  }),
  (snapshot) => {
    points.set(snapshot.points);
    objects.set(snapshot.objects);
  }
);

export const reversible = <TArgs extends unknown[]>(
  fn: (...args: TArgs) => void
) => {
  return (...args: TArgs) => changes.push(() => fn(...args));
};
