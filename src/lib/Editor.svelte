<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { onMount } from "svelte";
  import { deleteObject, newArc, newArcPoint, newPosition } from "./actions";
  import { CursorType, MouseButtons } from "./constants";
  import {
    activeTool,
    editingElement,
    hoveredElement,
    objects,
    points,
    selection,
    type Point,
    type Tool,
    changes,
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

  const cursorsForTool: Record<Tool, string> = {
    arc: CursorType.crosshair,
    hand: CursorType.grab,
    select: CursorType.auto,
    position: CursorType.crosshair,
  };

  $: cursor = cursorsForTool[$activeTool];
  $: viewportPoints = $points.map((p) => add(multiply(p, zoom), viewport));

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

    if (!isDragging) {
      const closePoint = $points.find((p) => distance(p, cursorPosition) < 10);
      if (closePoint) {
        cursorPosition = closePoint;
      }
    }

    if (isDragging) {
      const selectedObj = $objects[$selection];

      const draggingIndex = selectedObj.points.find(
        (i) => distance($points[i], cursorPosition) < 10
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
        const [first, ...coords] = o.points.map((i) => $points[i]);

        if (o.type === "position") {
          if (distance(cursorPosition, first) < 5) {
            hoveredElement.update(() => i);
          }
        }

        if (o.type === "arc") {
          if (isCloseToPolyline(cursorPosition, [first, ...coords])) {
            hoveredElement.update(() => i);
          }
        }
      });
    }

    if ($activeTool === "hand" && isPanning) {
      const delta = elementToCanvasCoords({ x: e.movementX, y: e.movementY });

      viewport = { ...viewport, ...add(viewport, delta) };
      viewport.x = clamp(viewport.x, width - viewport.w * zoom, 0);
      viewport.y = clamp(viewport.y, height - viewport.h * zoom, 0);
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

    if ($selection !== -1) {
      isDragging = true;
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button !== MouseButtons.main) {
      return;
    }

    isPanning = false;
    isDragging = false;

    if ($activeTool === "hand") {
      cursor = CursorType.grab;
    }

    if ($activeTool === "position") {
      newPosition(cursorPosition);
    }

    if ($activeTool === "arc") {
      if ($editingElement === -1) {
        $editingElement = $objects.length;
        newArc();
      }

      newArcPoint($editingElement, cursorPosition);

      const { points } = $objects[$editingElement];
      if (points.length >= 2 && points.at(0) === points.at(-1)) {
        $editingElement = -1;
      }
    }

    if ($activeTool === "select") {
      $selection = $hoveredElement;
    }
  }

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
        const p = viewportPoints[o.points[0]];
        rc.circle(...toTuple(p), 5, options);
      }

      if (o.type === "arc") {
        const coords = o.points.map((i) => viewportPoints[i]);

        if ($editingElement === i) {
          coords.push(cursorPosition);
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
      const editing = $objects[$editingElement];

      if (editing.type === "arc" && editing.points.length === 1) {
        () => deleteObject($editingElement);
      }
    }

    $selection = -1;
    $editingElement = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      clearFocus();
    }

    if (e.metaKey && e.key === "z") {
      if (e.shiftKey) {
        changes.redo();
      } else {
        changes.undo();
      }
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if ($selection !== -1) {
        deleteObject($selection);
        $selection = -1;
        $editingElement = -1;
      }
    }
  }

  function handleMouseWheel(e: WheelEvent) {
    const newZoom = Number((zoom + Math.sign(e.deltaY) * 1).toPrecision(2));

    zoom = clamp(newZoom, 1, 8);
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
    <button
      class="py-1 px-4 rounded-md bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
      disabled={$changes.first}
      on:click={changes.undo}>undo</button
    >
    |
    <button
      class="py-1 px-4 rounded-md bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
      disabled={$changes.last}
      on:click={changes.redo}>redo</button
    >
  </div>
</div>
