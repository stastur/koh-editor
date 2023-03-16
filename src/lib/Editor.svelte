<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { onMount } from "svelte";
  import {
    activeTool,
    editingElement,
    hoveredElement,
    objects,
    points,
    selection,
    type Obj,
    type Point,
  } from "./store";
  import { distance, isCloseToPolyline, toTuple } from "./utils";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;

  let rc: RoughCanvas;

  let dragging = false;

  onMount(() => {
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    rc = r.canvas(canvas, { options: { seed: 420, roughness: 0 } });
  });

  const toScene = (
    p: Point,
    target: { width: number; height: number },
    source: { width: number; height: number }
  ) => {
    const canvasPoint = { ...p };

    canvasPoint.x *= target.width / source.width;
    canvasPoint.y *= target.height / source.height;

    canvasPoint.x = Math.floor(canvasPoint.x);
    canvasPoint.y = Math.floor(canvasPoint.y);

    return canvasPoint;
  };

  const toCanvas = (p: Point) =>
    toScene(p, canvas, canvas.getBoundingClientRect());

  const fromCanvas = (p: Point) =>
    toScene(p, canvas.getBoundingClientRect(), canvas);

  const objectPoints = (o: Obj) => o.points.map((i) => $points[i]);

  let handleMouseDown = () => {
    if ($selection !== -1) {
      dragging = true;
    }
  };

  let handleMouseUp = () => {
    if ($selection !== -1) {
      dragging = false;
    }
  };

  $: handleMove = (e: MouseEvent) => {
    const cursorPosition = toCanvas({ x: e.offsetX, y: e.offsetY });

    if (dragging) {
      const selectedObj = $objects[$selection];

      const draggingIndex = selectedObj.points.find(
        (i) => distance($points[i], cursorPosition) < 5
      );

      if (draggingIndex !== undefined) {
        points.update((self) => {
          self[draggingIndex] = cursorPosition;
          return self;
        });
      }
    }

    if ($activeTool === "select") {
      hoveredElement.update(() => -1);

      $objects.map((o, i) => {
        const [start, ...coords] = objectPoints(o);

        if (o.type === "position") {
          if (distance(cursorPosition, start) < 5) {
            hoveredElement.update(() => i);
          }
        }

        if (o.type === "arc") {
          if (isCloseToPolyline(cursorPosition, [start, ...coords])) {
            hoveredElement.update(() => i);
          }
        }
      });
    }
  };

  $: handleClick = (e: MouseEvent) => {
    const cursorPosition = toCanvas({ x: e.offsetX, y: e.offsetY });

    if ($activeTool === "position") {
      const pointIndex = $points.length;
      const position: Obj = { type: "position", points: [pointIndex] };

      $points.push(cursorPosition);
      $objects.push(position);
    }

    if ($activeTool === "arc") {
      if ($editingElement === -1) {
        $editingElement = $objects.length;
        $objects.push({ type: "arc", points: [] });
      }

      const editing = $objects[$editingElement];
      const startPointIndex = editing.points.at(0);

      if (
        startPointIndex !== undefined &&
        distance(cursorPosition, $points[startPointIndex]) < 5
      ) {
        editing.points.push(startPointIndex);
        $editingElement = -1;
      } else {
        const existingPointIndex = $points.findIndex((p) => {
          if (distance(cursorPosition, p) < 5) {
            return true;
          }

          return false;
        });

        const nextPointIndex =
          existingPointIndex !== -1
            ? existingPointIndex
            : $points.push(cursorPosition) - 1;

        editing.points.push(nextPointIndex);
      }
    }

    if ($activeTool === "select") {
      $selection = $hoveredElement;
    }

    $points = $points;
    $objects = $objects;
  };

  $: if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $objects.forEach((o, i) => {
      const options: Options = {};
      const selected = $selection === i;
      const hovered = $hoveredElement === i;

      if (selected || hovered) {
        options.stroke = "blue";
      }

      if (o.type === "position") {
        const p = $points[o.points[0]];
        rc.circle(p.x, p.y, 5, options);
      }

      if (o.type === "arc") {
        const coords = o.points.map((i) => $points[i]);

        rc.linearPath(coords.map(toTuple), options);

        if (selected) {
          coords.forEach((p) =>
            rc.circle(...toTuple(p), 8, { fill: "white", fillStyle: "solid" })
          );
        }
      }
    });
  }

  const handleKeys = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      $selection = -1;
      $editingElement = -1;
    }
  };
</script>

<svelte:window on:keyup={handleKeys} />

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class="h-full aspect-square"
    on:mouseup={handleMouseUp}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMove}
    on:click={handleClick}
  />
</div>
