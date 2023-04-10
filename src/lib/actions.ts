import { z } from "zod";
import { adjacentChunks, distance, distortLine, unique } from "./utils";
import { objects, points } from "./state";
import { get } from "svelte/store";
import type { Point } from "./types";

type Key = `${number}_${number}`;

const createKey = (start: number, end: number) => `${start}_${end}` as Key;
const reverseKey = (k: Key) => k.split("_").reverse().join("_") as Key;

export const distortEdges = () => {
  const lineDistortion = new Map<Key, number[]>();

  objects.update(($objects) => {
    $objects.forEach((o) => {
      if (o.points.length < 2) {
        return;
      }

      const distortedPoints = adjacentChunks(o.points, 2).flatMap(
        (chunk, i, arr) => {
          const [s, e] = chunk;
          const k = createKey(s, e);
          const rk = reverseKey(k);

          const cached = lineDistortion.has(k) || lineDistortion.has(rk);

          if (!cached) {
            points.update(($points) => {
              const newPoints = distortLine([$points[s], $points[e]]).slice(
                1,
                -1
              );
              const startIndex = $points.length;

              $points.push(...newPoints);

              lineDistortion.set(
                k,
                newPoints.map((_, i) => i + startIndex)
              );

              return $points;
            });
          }

          const indices =
            lineDistortion.get(k) || lineDistortion.get(rk)?.reverse();

          const distorted = [s, ...(indices || []), e];

          const isLastChunk = i === arr.length - 1;
          !isLastChunk && distorted.pop();

          return distorted;
        }
      );

      o.points = distortedPoints;
    });

    return $objects;
  });
};

export const newPosition = (point: Point) => {
  objects.update(($objects) => {
    const insertedAt = get(points).length;

    points.update(($points) => {
      $points.push(point);
      return $points;
    });

    $objects.push({ type: "position", points: [insertedAt], properties: {} });
    return $objects;
  });
};

export const newArc = () => {
  objects.update(($objects) => {
    $objects.push({ type: "arc", points: [], properties: {} });
    return $objects;
  });
};

export const newArcPoint = (arcIndex: number, newPoint: Point) => {
  objects.update(($objects) => {
    const arc = $objects.at(arcIndex);

    if (!arc) {
      return $objects;
    }

    let pointIndex = get(points).findIndex(
      (existing) => distance(existing, newPoint) < 10
    );

    if (pointIndex === -1) {
      pointIndex = get(points).length;
      points.update(($points) => {
        $points.push(newPoint);
        return $points;
      });
    }

    arc.points.push(pointIndex);

    return $objects;
  });
};

export const deleteObject = (index: number) => {
  objects.update(($objects) => {
    const [deleted] = $objects.splice(index, 1);

    const orphaned = unique(deleted.points).filter((pi) =>
      $objects.every((o) => !o.points.includes(pi))
    );

    orphaned.forEach((orphan) =>
      points.update(($points) => {
        $points.splice(orphan, 1);
        return $points;
      })
    );

    $objects.forEach((o) => {
      const shiftedPoints = o.points.map((oldIndex) => {
        return orphaned.reduce(
          (shiftedIndex, orphanedIndex) =>
            shiftedIndex - Number(oldIndex > orphanedIndex),
          oldIndex
        );
      });

      o.points = shiftedPoints;
    });

    return $objects;
  });
};

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

    objects.set(parsed.objects);
    points.set(parsed.points);
  } catch (e) {
    alert((e as Error).message);
  }
}
