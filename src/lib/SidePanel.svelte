<script lang="ts">
  import { derived } from "svelte/store";
  import { distortEdges, importTopology, newObjectProp } from "./actions";
  import { appState } from "./state";

  import type { Tool } from "./types";

  const { points, objects, selected, activeTool, history } = appState;

  const exportLink = derived([points, objects], ([$points, $objects]) => {
    const topology = { points: $points, objects: $objects };
    const json = JSON.stringify(topology, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    return URL.createObjectURL(blob);
  });

  const tools: Array<Tool> = ["hand", "select", "arc", "position"];
  const numberOfArcs = derived(
    objects,
    ($objects) => $objects.filter((o) => o.type === "arc").length
  );

  $: element = $selected !== -1 ? $objects[$selected] : null;

  const newProp = { key: "", value: "" };

  const addProp = () => {
    if (element) {
      newObjectProp($selected, [newProp.key, newProp.value]);

      newProp.key = "";
      newProp.value = "";
    }
  };

  let fileInput: HTMLInputElement;
</script>

<div class="flex flex-col items-start gap-2">
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
      class="btn"
      disabled={$numberOfArcs === 0}
      on:click={() => {
        distortEdges();
        history.commit();
      }}
    >
      Distort edges
    </button>
  </div>

  {#if element}
    <div>
      <fieldset class="flex flex-col items-start gap-2">
        <legend>Properties</legend>

        <div>
          {#each Object.keys(element.properties) as key}
            <div>
              <span>
                {key}
              </span>:
              <span
                contenteditable
                bind:textContent={$objects[$selected].properties[key]}
              />
            </div>
          {/each}
        </div>

        <div class="flex">
          <span
            contenteditable
            data-ph="key"
            class="placeholder"
            bind:textContent={newProp.key}
          />:
          <span
            contenteditable
            data-ph="value"
            class="placeholder"
            bind:textContent={newProp.value}
          />
        </div>

        <button
          class="btn"
          disabled={!newProp.value && !newProp.value}
          on:click={addProp}
        >
          Add
        </button>
      </fieldset>
    </div>
  {/if}

  <div class="flex gap-2">
    <a class="btn" href={$exportLink} download="topology.json"> Export </a>

    <input
      type="file"
      accept=".json"
      hidden
      bind:this={fileInput}
      on:change={(e) => {
        const file = e.currentTarget.files?.[0];
        file?.text().then(importTopology);
      }}
    />
    <button class="btn" on:click={() => fileInput.click()}> Import </button>
  </div>
</div>

<style lang="postcss">
  .placeholder:empty:after {
    content: attr(data-ph);
    cursor: text;
    color: theme(textColor.gray.400);
  }
</style>
