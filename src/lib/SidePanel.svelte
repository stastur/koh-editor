<script lang="ts">
  import { derived } from "svelte/store";
  import { distort } from "./actions";
  import { activeTool, objects, type Tool } from "./store";

  const tools: Array<Tool> = ["select", "arc", "position"];

  const arcs = derived(objects, ($objects) => $objects.filter((o) => o.type));
</script>

<div>
  <fieldset class="flex flex-col">
    <legend>Current type</legend>

    {#each tools as t}
      <label>
        <input id={t} type="radio" value={t} bind:group={$activeTool} />
        {t}
      </label>
    {/each}
  </fieldset>

  <div>
    <button
      class="py-1 px-4 rounded-md bg-gray-100 disabled:cursor-not-allowed"
      disabled={$arcs.length === 0}
      on:click={distort}>Distort</button
    >
  </div>
</div>
