import { derived, get, writable } from "svelte/store";
import { enablePatches, applyPatches, produce } from "immer";
import type { Patch, Objectish, Draft } from "immer/dist/internal";

enablePatches();

export type Point = { x: number; y: number };

export type Obj = {
  type: "arc" | "position";
  points: number[];
  properties: Record<string, string>;
};

export type Tool = Obj["type"] | "select" | "hand";
export const activeTool = writable<Tool>("select");

export const selection = writable(-1);
export const editingElement = writable(-1);
export const hoveredElement = writable(-1);

export const state = createState({
  objects: [] as Obj[],
  points: [] as Point[],
});

export const exportLink = derived(state, ({ points, objects }) => {
  const topology = { points, objects };
  const json = JSON.stringify(topology, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  return URL.createObjectURL(blob);
});

function createState<T extends Objectish>(initial: T) {
  const state = writable(initial);
  const redoState = writable({ canUndo: false, canRedo: false });

  const changes: { redo: Patch[]; undo: Patch[] }[] = [];
  let version = 0;

  const update = (producer: (draft: Draft<T>) => void, tracking = true) =>
    state.set(
      produce(
        get(state),
        (draft) => {
          producer(draft);
        },
        (patches, inversePatches) => {
          if (!tracking) return;

          if (!changes.at(version)) {
            changes.push({ redo: [], undo: [] });
          }

          const change = changes.at(version)!;
          change.redo.push(...patches);
          change.undo.unshift(...inversePatches);
        }
      )
    );

  const syncStatus = () => {
    redoState.set({
      canUndo: version > 0,
      canRedo: version < changes.length,
    });
  };

  const commit = () => {
    if (changes.at(version)?.redo.length) {
      version++;
      changes.length = version;
      syncStatus();
    }
  };

  const undo = () => {
    if (version > 0) {
      version--;
      state.set(applyPatches(get(state), changes[version].undo));
      syncStatus();
    }
  };

  const redo = () => {
    if (version < changes.length) {
      state.set(applyPatches(get(state), changes[version].redo));
      version++;
      syncStatus();
    }
  };

  return { subscribe: state.subscribe, update, undo, redo, commit, redoState };
}
