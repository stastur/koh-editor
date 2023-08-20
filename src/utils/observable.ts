type Observer<T> = (data: T) => void;

export class Observable<T> {
  observers: Observer<T>[] = [];

  subscribe(fn: Observer<T>) {
    this.observers.push(fn);
  }

  unsubscribe(fn: Observer<T>) {
    this.observers = this.observers.filter((observer) => observer !== fn);
  }

  notify(data: T) {
    this.observers.forEach((observer) => observer(data));
  }
}
