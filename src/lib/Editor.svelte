<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import { onMount } from "svelte";
  import { type Point, points, selection } from "./store";
  import { distance } from "./utils";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;

  let rc: RoughCanvas;

  onMount(() => {
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    rc = r.canvas(canvas, { options: { seed: 420, roughness: 0 } });
  });

  const projectPoint = (
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
    projectPoint(p, canvas, canvas.getBoundingClientRect());

  const fromCanvas = (p: Point) =>
    projectPoint(p, canvas.getBoundingClientRect(), canvas);

  let dragging = false;
  let hoveredPointIndex = -1;

  $: handleMove = (e: MouseEvent) => {
    const cursor = toCanvas({ x: e.offsetX, y: e.offsetY });
    hoveredPointIndex = $points.findIndex((p) => distance(cursor, p) < 10);

    if (dragging) {
      $points[hoveredPointIndex] = cursor;
    }
  };

  const resetSelection = () => {
    $selection = -1;
  };

  const selectHoveredPoint = () => {
    $selection = hoveredPointIndex;
  };

  const createPointOnClick = (e: MouseEvent) => {
    const p = toCanvas({ x: e.offsetX, y: e.offsetY });

    if (hoveredPointIndex === -1 && $selection === -1) {
      $points = [...$points, p];
      hoveredPointIndex = $points.length;
    } else {
      resetSelection();
    }
  };

  $: if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $points.forEach((p, i) => {
      rc.circle(p.x, p.y, 10, {
        stroke:
          i === hoveredPointIndex || i === $selection ? "blue" : undefined,
      });
    });
  }

  const startDragging = () => {
    if (hoveredPointIndex !== -1) {
      dragging = true;
    }
  };

  const endDragging = () => {
    dragging = false;
  };
</script>

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class:cursor-move={hoveredPointIndex !== -1}
    class="h-full aspect-square"
    on:mousedown={startDragging}
    on:mouseup={endDragging}
    on:mousemove={handleMove}
    on:click={createPointOnClick}
    on:click={selectHoveredPoint}
  />
</div>
