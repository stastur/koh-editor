<script lang="ts">
  import r from "roughjs";
  import type { RoughCanvas } from "roughjs/bin/canvas";
  import type { Options } from "roughjs/bin/core";
  import { onMount } from "svelte";
  import { deleteObject, newArc, newArcPoint, newPosition } from "./actions";
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

  let cursorPosition = { x: 0, y: 0 };
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

  const handleMove = (e: MouseEvent) => {
    cursorPosition = toCanvas({ x: e.offsetX, y: e.offsetY });

    if (!dragging) {
      const closePoint = $points.find((p) => distance(p, cursorPosition) < 10);
      if (closePoint) {
        cursorPosition = closePoint;
      }
    }

    if (dragging) {
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
        const [first, ...coords] = objectPoints(o);

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
  };

  const handleClick = () => {
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

        if ($editingElement === i) {
          coords.push(cursorPosition);
        }

        rc.linearPath(coords.map(toTuple), options);

        if (selected) {
          coords.forEach((p) =>
            rc.circle(...toTuple(p), 8, { fill: "white", fillStyle: "solid" })
          );
        }
      }
    });
  }

  const clearFocus = () => {
    if ($editingElement !== -1) {
      const editing = $objects[$editingElement];

      if (editing.type === "arc" && editing.points.length === 1) {
        deleteObject($editingElement);
      }
    }

    $selection = -1;
    $editingElement = -1;
  };

  const handleKeys = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearFocus();
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if ($selection !== -1) {
        deleteObject($selection);
        $selection = -1;
        $editingElement = -1;
      }
    }
  };
</script>

<svelte:body on:keyup|self={handleKeys} />

<div class="h-fill m-2 relative border-black border-2">
  <canvas
    bind:this={canvas}
    class="h-full aspect-square"
    class:cursor-crosshair={$activeTool !== "select"}
    on:contextmenu|preventDefault={clearFocus}
    on:mouseup={handleMouseUp}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMove}
    on:click={handleClick}
  />
</div>
