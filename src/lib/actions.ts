import { z } from "zod";
import { editingElement, type Point } from "./store";
import { adjacentChunks, distance, distortLine, unique } from "./utils";
import { state } from "./store";

type Key = `${number}_${number}`;

const createKey = (start: number, end: number) => `${start}_${end}` as Key;
const reverseKey = (k: Key) => k.split("_").reverse().join("_") as Key;

export const distortEdges = () => {
  const lineDistortion = new Map<Key, number[]>();

  state.update(({ objects, points }) =>
    objects.forEach((o) => {
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
            const newPoints = distortLine([points[s], points[e]]).slice(1, -1);
            const startIndex = points.length;

            points.push(...newPoints);

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

      o.points = distortedPoints;
    })
  );
};

export const newPosition = (point: Point) => {
  state.update(({ objects, points }) => {
    const insertedAt = points.length;

    points.push(point);
    objects.push({ type: "position", points: [insertedAt], properties: {} });
  });
};

export const newArc = () => {
  state.update(({ objects }) => {
    editingElement.update(() => objects.length);
    objects.push({ type: "arc", points: [], properties: {} });
  });
};

export const newArcPoint = (arcIndex: number, newPoint: Point) => {
  state.update(({ objects, points }) => {
    const arc = objects.at(arcIndex);

    if (!arc) {
      return objects;
    }

    let pointIndex = points.findIndex(
      (existing) => distance(existing, newPoint) < 10
    );

    if (pointIndex === -1) {
      pointIndex = points.length;
      points.push(newPoint);
    }

    arc.points.push(pointIndex);

    return objects;
  });
};

export const deleteObject = (index: number) => {
  state.update(({ objects, points }) => {
    const [deleted] = objects.splice(index, 1);

    const orphaned = unique(deleted.points).filter((pi) =>
      objects.every((o) => !o.points.includes(pi))
    );

    orphaned.forEach((orphan) => points.splice(orphan, 1));

    objects.forEach((o) => {
      const shiftedPoints = o.points.map((oldIndex) => {
        return orphaned.reduce(
          (shiftedIndex, orphanedIndex) =>
            shiftedIndex - Number(oldIndex > orphanedIndex),
          oldIndex
        );
      });

      o.points = shiftedPoints;
    });
  });
};

export function newObjectProp(
  objIndex: number,
  [key, value]: [string, string]
) {
  state.update(({ objects }) => {
    objects[objIndex].properties[key] = value;
  }, false);
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

    state.update((draft) => {
      draft.objects = parsed.objects;
      draft.points = parsed.points;
    });
  } catch (e) {
    alert((e as Error).message);
  }
}
