import { get } from "svelte/store";
import { objects, points } from "./store";
import { adjacentChunks, distortLine } from "./utils";

const createKey = (start: number, end: number) => `${start}_${end}` as const;
type Key = ReturnType<typeof createKey>;

export function distort() {
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
