<script lang="ts">
  import { onMount } from "svelte";
  import { RoughCanvas } from "./canvas/rough-canvas";
  import type { Canvas, Viewport } from "./canvas/types";
  import { Renderer } from "./shapes/renderer";

  let canvasElement: HTMLCanvasElement;
  let renderer: Renderer;
  let canvas: Canvas;

  let viewport: Viewport = {
    size: { width: window.innerWidth, height: window.innerHeight },
    position: { x: 0, y: 0 },
    scale: 1,
  };

  onMount(() => {
    canvas = new RoughCanvas(canvasElement);
    renderer = new Renderer(viewport, canvas);
  });
</script>

<canvas
  bind:this={canvasElement}
  width={window.innerWidth}
  height={window.innerHeight}
/>

<div class="fixed bottom-0 left-0 p-2">
  <span>Scale: {viewport.scale}</span>

  <div class="flex gap-2">
    <button on:click={() => (viewport.scale += 0.25)}>+</button>
    <button on:click={() => (viewport.scale -= 0.25)}>-</button>
  </div>
</div>
