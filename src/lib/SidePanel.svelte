<script lang="ts">
  import { activeTool, type Tool } from "./store";

  const tools: Array<Tool> = ["select", "arc", "polygon", "position"];
</script>

<fieldset class="flex flex-col">
  <legend>Current type</legend>

  {#each tools as t}
    <label>
      <input id={t} type="radio" value={t} bind:group={$activeTool} />
      {t}
    </label>
  {/each}
</fieldset>
