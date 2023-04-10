<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { P, match } from "ts-pattern";
  import { onMount } from "svelte";
  import { deleteObject } from "./actions";
  import { toTuple, add, multiply } from "./utils";
  import { Editor, strategies } from "./editor";
  import {
    activeTool,
    cursor,
    history,
    objects,
    points,
    selected,
    viewport,
    zoom,
  } from "./state";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;
  let editor: Editor;

  let rc: RoughCanvas;

  const historyState = history.state;

  $: editor && (editor.strategy = strategies[$activeTool]);
  $: viewportPoints = $points.map((p) => add(multiply(p, $zoom), $viewport));

  onMount(() => {
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    editor = new Editor(canvas);

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

  function handleKeyDown(e: KeyboardEvent) {
    match(e)
      .with({ key: P.union("Delete", "Backspace") }, () => {
        if ($selected !== -1) {
          deleteObject($selected);
          history.commit();
        }
      })
      .with({ metaKey: true, shiftKey: true, key: "z" }, () => history.redo())
      .with({ metaKey: true, key: "z" }, () => history.undo())
      .otherwise(() => {});
  }
</script>

<svelte:body on:keydown|self={handleKeyDown} />

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
