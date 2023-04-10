<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { onMount } from "svelte";
  import { toTuple, add, multiply } from "./utils";
  import { Editor, strategies } from "./editor";
  import { appState } from "./state";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;
  let editor: Editor;

  let rc: RoughCanvas;

  const {
    activeTool,
    cursor,
    history,
    objects,
    points,
    selected,
    viewport,
    zoom,
  } = appState;
  const historyState = history.state;

  $: editor && (editor.strategy = strategies[$activeTool]);
  $: viewportPoints = $points.map((p) => add(multiply(p, $zoom), $viewport));

  onMount(() => {
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    editor = new Editor(canvas, appState);

    rc = r.canvas(canvas, { options: { seed: 420, roughness: 0 } });
  });

  $: if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $objects.forEach((o, i) => {
      const options: Options = {};
      const isSelected = $selected === i;

      if (isSelected) {
        options.stroke = "blue";
      }

      if (o.type === "position") {
        const p = viewportPoints[o.points[0]];
        rc.circle(...toTuple(p), 5, options);
      }

      if (o.type === "arc") {
        const coords = o.points.map((i) => viewportPoints[i]);

        rc.linearPath(
          coords.map((p) => toTuple(p)),
          options
        );

        if (isSelected) {
          coords.forEach((p) =>
            rc.circle(...toTuple(p), 8, {
              fill: "white",
              fillStyle: "solid",
            })
          );
        }
      }
    });
  }
</script>

<svelte:body on:keydown|self={editor.onKeyDown} />

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class="h-full aspect-square"
    style:cursor={$cursor.type}
    on:mousemove={editor.onMouseMove}
    on:mousedown={editor.onMouseDown}
    on:mouseup={editor.onMouseUp}
    on:wheel={editor.onWheel}
  />
  <div class="absolute m-4 p-2 left-0 bottom-0">
    <span>{$zoom * 100}%</span>
    <button
      class="btn"
      disabled={!$historyState.canUndo}
      on:click={history.undo}>undo</button
    >
    |
    <button
      class="btn"
      disabled={!$historyState.canRedo}
      on:click={history.redo}>redo</button
    >
  </div>
</div>
