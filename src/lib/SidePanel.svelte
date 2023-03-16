<script lang="ts">
  import { activeShape, type Obj } from "./store";

  const types: Array<Obj["type"]> = ["arc", "polygon", "position"];
</script>

<fieldset class="flex flex-col">
  <legend>Current type</legend>

  {#each types as t}
    <label>
      <input id={t} type="radio" value={t} bind:group={$activeShape} />
      {t}
    </label>
  {/each}
</fieldset>
