<script lang="ts">
  import { derived } from "svelte/store";
  import { deleteObject, distortEdges } from "./actions";
  import {
    activeTool,
    editingElement,
    objects,
    selection,
    type Tool,
  } from "./store";

  const tools: Array<Tool> = ["select", "arc", "position"];
  const arcs = derived(objects, ($objects) => $objects.filter((o) => o.type));

  $: element = $selection !== -1 ? $objects[$selection] : null;

  const newProp = { key: "", value: "" };

  const addProp = () => {
    if (element) {
      element.properties = {
        ...element.properties,
        [newProp.key]: newProp.value,
      };

      newProp.key = "";
      newProp.value = "";
    }
  };
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
      class="py-1 px-4 rounded-md bg-gray-100 disabled:cursor-not-allowed"
      disabled={$arcs.length === 0}
      on:click={distortEdges}
    >
      Distort edges
    </button>
  </div>

  {#if element}
    <button
      class="py-1 px-4 rounded-md bg-gray-100 disabled:cursor-not-allowed"
      on:click={() => {
        deleteObject($selection);
        $selection = -1;
        $editingElement = -1;
      }}
    >
      Delete
    </button>

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
                bind:textContent={element.properties[key]}
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
          class="py-1 px-4 rounded-md bg-gray-100 disabled:cursor-not-allowed"
          disabled={!newProp.value && !newProp.value}
          on:click={addProp}
        >
          Add
        </button>
      </fieldset>
    </div>
  {/if}
</div>

<style lang="postcss">
  .placeholder:empty:after {
    content: attr(data-ph);
    cursor: text;
    color: theme(textColor.gray.400);
  }
</style>
