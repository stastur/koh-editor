export interface Path {
  points: number[];
}

export interface Position {
  point: number;
}

export interface Storage<T extends Path | Position> {
  points: Uint16Array[];

  objects: T[];
}
