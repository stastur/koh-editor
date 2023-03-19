import { z } from "zod";
import { get } from "svelte/store";
import { editingElement, objects, points, type Point } from "./store";
import { adjacentChunks, distance, distortLine, unique } from "./utils";

type Key = `${number}_${number}`;

const createKey = (start: number, end: number) => `${start}_${end}` as Key;
const reverseKey = (k: Key) => k.split("_").reverse().join("_") as Key;

export function distortEdges() {
  const lineDistortion = new Map<Key, number[]>();

  objects.update((self) =>
    self.map((o) => {
      if (o.points.length < 2) {
        return o;
      }

      const distortedPoints = adjacentChunks(o.points, 2).flatMap(
        (chunk, i, arr) => {
          const [s, e] = chunk;
          const k = createKey(s, e);
          const rk = reverseKey(k);

          const cached = lineDistortion.has(k) || lineDistortion.has(rk);

          if (!cached) {
            const $points = get(points);
            const newPoints = distortLine([$points[s], $points[e]]).slice(
              1,
              -1
            );
            const startIndex = $points.length;

            points.update((self) => [...self, ...newPoints]);

            lineDistortion.set(
              k,
              newPoints.map((_, i) => i + startIndex)
            );
          }

          const indices =
            lineDistortion.get(k) || lineDistortion.get(rk)?.reverse();

          const distorted = [s, ...(indices || []), e];

          const isLastChunk = i === arr.length - 1;
          !isLastChunk && distorted.pop();

          return distorted;
        }
      );

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
    { type: "position", points: [insertedAt], properties: {} },
  ]);
}

export function newArc() {
  editingElement.update(() => get(objects).length);
  objects.update((self) => [
    ...self,
    { type: "arc", points: [], properties: {} },
  ]);
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

export function deleteObject(index: number) {
  objects.update(($objects) => {
    const [deleted] = $objects.splice(index, 1);

    const orphaned = unique(deleted.points).filter((pi) =>
      $objects.every((o) => !o.points.includes(pi))
    );

    points.update(($points) => $points.filter((_, i) => !orphaned.includes(i)));

    return $objects.map((o) => {
      const shiftedPoints = o.points.map((oldIndex) => {
        return orphaned.reduce(
          (shiftedIndex, orphanedIndex) =>
            shiftedIndex - Number(oldIndex > orphanedIndex),
          oldIndex
        );
      });

      return { ...o, points: shiftedPoints };
    });
  });
}

export function newObjectProp(
  objIndex: number,
  [key, value]: [string, string]
) {
  objects.update(($objects) => {
    $objects[objIndex].properties[key] = value;

    return $objects;
  });
}

const TopoSchema = z.object({
  points: z.object({ x: z.number(), y: z.number() }).array(),
  objects: z
    .object({
      type: z.enum(["arc", "position"]),
      points: z.number().array(),
      properties: z.record(z.string()).default({}),
    })
    .array(),
});

export function importTopology(json: string) {
  try {
    const parsed = TopoSchema.parse(JSON.parse(json));

    points.update(() => parsed.points);
    objects.update(() => parsed.objects);
  } catch (e) {
    alert((e as Error).message);
  }
}
