import { get } from "svelte/store";
import { editingElement, objects, points, type Point } from "./store";
import { adjacentChunks, distance, distortLine } from "./utils";

const createKey = (start: number, end: number) => `${start}_${end}` as const;
type Key = ReturnType<typeof createKey>;

export function distortEdges() {
  const lineDistortion = new Map<Key, number[]>();

  objects.update((self) =>
    self.map((o) => {
      if (o.points.length < 2) {
        return o;
      }

      const distortedPoints = adjacentChunks(o.points, 2).flatMap((chunk) => {
        const [s, e] = chunk;
        const k = createKey(s, e);

        if (!lineDistortion.has(k)) {
          const $points = get(points);

          const newPoints = distortLine([$points[s], $points[e]]).slice(1, -1);
          const startIndex = $points.length;

          points.update((self) => [...self, ...newPoints]);

          lineDistortion.set(
            k,
            newPoints.map((_, i) => i + startIndex)
          );
        }

        return [s, ...(lineDistortion.get(k) || []), e];
      });

      return { ...o, points: distortedPoints };
    })
  );
}

export function newPosition(point: Point) {
  const $points = get(points);
  const insertedAt = $points.length;

  points.update((self) => [...self, point]);
  objects.update((self) => [
    ...self,
    { type: "position", points: [insertedAt] },
  ]);
}

export function newArc() {
  editingElement.update(() => get(objects).length);
  objects.update((self) => [...self, { type: "arc", points: [] }]);
}

export function newArcPoint(arcIndex: number, newPoint: Point) {
  const $points = get(points);

  objects.update((self) => {
    const arc = self.at(arcIndex);

    if (!arc) {
      return self;
    }

    let pointIndex = $points.findIndex(
      (existing) => distance(existing, newPoint) < 10
    );

    if (pointIndex === -1) {
      pointIndex = $points.length;
      points.update((s) => [...s, newPoint]);
    }

    arc.points.push(pointIndex);

    return self;
  });
}
