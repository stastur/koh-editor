<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { P, match } from "ts-pattern";
  import { onMount } from "svelte";
  import { deleteObject, newArc, newArcPoint, newPosition } from "./actions";
  import { CursorType, MouseButtons } from "./constants";
  import {
    activeTool,
    editingElement,
    hoveredElement,
    selection,
    state,
    type Point,
    type Tool,
  } from "./store";
  import {
    distance,
    isCloseToPolyline,
    roundPoint,
    subtract,
    toScene,
    toTuple,
    add,
    clamp,
    multiply,
    divide,
  } from "./utils";
  import { derived } from "svelte/store";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let height = 1024;
  let width = 1024;

  let rc: RoughCanvas;

  let viewport = { x: 0, y: 0, w: width, h: height };
  let cursorPosition = { x: 0, y: 0 };
  let isDragging = false;
  let isPanning = false;
  let zoom = 1;

  $: canUndo = derived(state.redoState, (s) => s.canUndo);
  $: canRedo = derived(state.redoState, (s) => s.canRedo);

  const cursorsForTool: Record<Tool, string> = {
    arc: CursorType.crosshair,
    hand: CursorType.grab,
    select: CursorType.auto,
    position: CursorType.crosshair,
  };

  $: cursor = cursorsForTool[$activeTool];
  $: viewportPoints = $state.points.map((p) =>
    add(multiply(p, zoom), viewport)
  );

  onMount(() => {
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    rc = r.canvas(canvas, { options: { seed: 420, roughness: 0 } });
  });

  const elementToCanvasCoords = (p: Point) =>
    toScene(p, canvas, canvas.getBoundingClientRect());

  const canvasToElementCoords = (p: Point) =>
    toScene(p, canvas.getBoundingClientRect(), canvas);

  function handleMove(e: MouseEvent) {
    cursorPosition = roundPoint(
      divide(
        subtract(
          elementToCanvasCoords({ x: e.offsetX, y: e.offsetY }),
          viewport
        ),
        zoom
      )
    );

    if ($activeTool === "select") {
      if (isDragging) {
        const selectedObj = $state.objects[$selection];

        const draggingIndex = selectedObj.points.find(
          (i) => distance($state.points[i], cursorPosition) < 10
        );

        if (draggingIndex !== undefined) {
          state.update(
            ({ points }) => (points[draggingIndex] = cursorPosition)
          );
        }
      } else {
        const elementUnder = $state.objects.findIndex((o) => {
          const coords = o.points.map((i) => $state.points[i]);

          if (o.type === "position") {
            return distance(cursorPosition, coords[0]) < 5;
          }

          if (o.type === "arc") {
            return isCloseToPolyline(cursorPosition, coords);
          }
        });

        hoveredElement.set(elementUnder);
      }
    }

    if ($activeTool === "hand" && isPanning) {
      const delta = elementToCanvasCoords({ x: e.movementX, y: e.movementY });

      viewport = { ...viewport, ...add(viewport, delta) };
      viewport.x = clamp(viewport.x, width - viewport.w * zoom, 0);
      viewport.y = clamp(viewport.y, height - viewport.h * zoom, 0);
    }

    if ($activeTool === "arc") {
      const closePoint = $state.points.find(
        (p) => distance(p, cursorPosition) < 10
      );
      if (closePoint) {
        cursorPosition = closePoint;
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== MouseButtons.main) {
      return;
    }

    if ($activeTool === "hand") {
      isPanning = true;
      cursor = CursorType.grabbing;
    }

    if ($activeTool === "select") {
      if ($selection !== -1) {
        isDragging = true;
      }
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button !== MouseButtons.main) {
      return;
    }

    if ($activeTool === "hand") {
      cursor = CursorType.grab;
    }

    if ($activeTool === "position") {
      newPosition(cursorPosition);
      state.commit();
    }

    if ($activeTool === "arc") {
      if ($editingElement === -1) {
        $editingElement = $state.objects.length;
        newArc();
      }

      newArcPoint($editingElement, cursorPosition);

      const { points } = $state.objects[$editingElement];
      if (points.length >= 2 && points.at(0) === points.at(-1)) {
        $editingElement = -1;
      }

      state.commit();
    }

    if ($activeTool === "select") {
      if (isDragging) {
        state.commit();
      } else {
        $selection = $hoveredElement;
      }
    }

    isPanning = false;
    isDragging = false;
  }

  $: if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    $state.objects.forEach((o, i) => {
      const options: Options = {};
      const selected = $selection === i;
      const hovered = $hoveredElement === i;

      if (selected || hovered) {
        options.stroke = "blue";
      }

      if (o.type === "position") {
        const p = viewportPoints[o.points[0]];
        rc.circle(...toTuple(p), 5, options);
      }

      if (o.type === "arc") {
        const coords = o.points.map((i) => viewportPoints[i]);

        if ($editingElement === i) {
          coords.push(add(multiply(cursorPosition, zoom), viewport));
        }

        rc.linearPath(
          coords.map((p) => toTuple(p)),
          options
        );

        if (selected) {
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
          $selection = -1;
          $editingElement = -1;
          state.commit();
        }
      })
      .with({ metaKey: true, shiftKey: true, key: "z" }, () => state.redo())
      .with({ metaKey: true, key: "z" }, () => state.undo())
      .otherwise(() => {});
  }

  function handleMouseWheel(e: WheelEvent) {
    const newZoom = Number((zoom + Math.sign(e.deltaY) * 1).toPrecision(2));
    zoom = clamp(newZoom, 1, 8);

    const offset = subtract(multiply(cursorPosition, zoom), cursorPosition);

    viewport.x = -offset.x;
    viewport.y = -offset.y;
  }
</script>

<svelte:body on:keydown|self={handleKeyDown} />

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class="h-full aspect-square"
    style:cursor
    on:contextmenu|preventDefault={clearFocus}
    on:mouseup={handleMouseUp}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMove}
    on:wheel={handleMouseWheel}
  />
  <div class="absolute m-4 p-2 left-0 bottom-0">
    <span>{zoom * 100}%</span>
    <button class="btn" disabled={!$canUndo} on:click={state.undo}>undo</button>
    |
    <button class="btn" disabled={!$canRedo} on:click={state.redo}>redo</button>
  </div>
</div>
