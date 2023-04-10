import { writable, get, type Unsubscriber, type Writable } from "svelte/store";

function subscribeIgnoreFirst<T>(
  store: Writable<T>,
  callback: (value: T) => void
) {
  let first = true;
  return store.subscribe((value) => {
    if (first) {
      first = false;
      return;
    }

    callback(value);
  });
}

export class History {
  index = 0;
  stack = new Array<unknown[]>();
  disposers = new Set<Unsubscriber>();

  state = writable({ canUndo: false, canRedo: false });

  constructor(private tracked: Writable<unknown>[]) {
    this.stack.push(this.tracked.map((store) => structuredClone(get(store))));
    this.index++;
    this.track();
  }

  private track() {
    this.tracked.forEach((store, storeIdx) => {
      this.disposers.add(
        subscribeIgnoreFirst(store, (v) => {
          if (!this.stack[this.index]) {
            this.stack[this.index] = new Array(this.tracked.length);
          }

          this.stack[this.index][storeIdx] = structuredClone(v);
        })
      );
    });
  }

  private update() {
    this.state.set({
      canUndo: this.index > 1,
      canRedo: this.index < this.stack.length - 1,
    });
  }

  private untrack() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers.clear();
  }

  private currentVersion() {
    return this.stack[this.index - 1];
  }

  private applyVersion() {
    this.untrack();

    const version = this.currentVersion();
    version &&
      this.tracked.forEach((store, storeIdx) => store.set(version[storeIdx]));

    this.track();
  }

  commit() {
    // TODO: fix when editing after few undo's
    this.index++;
    this.stack.length = this.index;
    this.update();
  }

  undo = () => {
    this.index > 1 && this.index--;
    this.applyVersion();
    this.update();
  };

  redo = () => {
    this.index < this.stack.length - 1 && this.index++;
    this.applyVersion();
    this.update();
  };
}
