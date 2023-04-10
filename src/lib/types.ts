export type Point = { x: number; y: number };

export type Obj = {
  type: "arc" | "position";
  points: number[];
  properties: Record<string, string>;
};

export type Tool = Obj["type"] | "select" | "hand";
