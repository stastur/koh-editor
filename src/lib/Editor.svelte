<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { P, match } from "ts-pattern";
  import { onMount } from "svelte";
  import { deleteObject } from "./actions";
  import { activeTool, editingElement, selection, state } from "./store";
  import { toTuple, add, multiply } from "./utils";
  import { derived } from "svelte/store";
  import {
    context,
    cursor,
    Editor,
    selected,
    strategies,
    viewport,
    zoom,
  } from "./editor";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;
  let editor: Editor;

  let rc: RoughCanvas;

  $: canUndo = derived(state.redoState, (s) => s.canUndo);
  $: canRedo = derived(state.redoState, (s) => s.canRedo);

  $: editor && (editor.strategy = strategies[$activeTool]);
  $: viewportPoints = $state.points.map((p) =>
    add(multiply(p, $zoom), $viewport)
  );

  onMount(() => {
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    editor = new Editor(canvas, context);

    rc = r.canvas(canvas, { options: { seed: 420, roughness: 0 } });
  });

  $: if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $state.objects.forEach((o, i) => {
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

        if ($editingElement === i) {
          coords.push(add(multiply($cursor.position, $zoom), $viewport));
        }

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

  function clearFocus() {
    if ($editingElement !== -1) {
      const editing = $state.objects[$editingElement];

      if (editing.type === "arc" && editing.points.length === 1) {
        deleteObject($editingElement);
        state.commit();
      }
    }

    $selection = -1;
    $editingElement = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    match(e)
      .with({ key: "Escape" }, () => clearFocus())
      .with({ key: P.union("Delete", "Backspace") }, () => {
        if ($selection !== -1) {
          deleteObject($selection);
          state.commit();
        }
      })
      .with({ metaKey: true, shiftKey: true, key: "z" }, () => state.redo())
      .with({ metaKey: true, key: "z" }, () => state.undo())
      .otherwise(() => {});
  }
</script>

<svelte:body on:keydown|self={handleKeyDown} />

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class="h-full aspect-square"
    style:cursor={$cursor.type}
    on:contextmenu|preventDefault={clearFocus}
    on:mousemove={editor.onMouseMove}
    on:mousedown={editor.onMouseDown}
    on:mouseup={editor.onMouseUp}
    on:wheel={editor.onWheel}
  />
  <div class="absolute m-4 p-2 left-0 bottom-0">
    <span>{$zoom * 100}%</span>
    <button class="btn" disabled={!$canUndo} on:click={state.undo}>undo</button>
    |
    <button class="btn" disabled={!$canRedo} on:click={state.redo}>redo</button>
  </div>
</div>
