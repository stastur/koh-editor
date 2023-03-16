<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import { onMount } from "svelte";
  import { activeTool, type Point } from "./store";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;

  let cursorPosition = { x: 0, y: 0 };
  let rc: RoughCanvas;

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

  $: handleMove = (e: MouseEvent) => {
    cursorPosition = toCanvas({ x: e.offsetX, y: e.offsetY });
  };

  $: handleClick = (e: MouseEvent) => {
    if ($activeTool === "select") {
    }
    if ($activeTool === "position") {
    }
    if ($activeTool === "arc") {
    }
    if ($activeTool === "polygon") {
    }
  };
</script>

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class="h-full aspect-square"
    on:mousemove={handleMove}
    on:click={handleClick}
  />
</div>
