<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let label = "-";
  export let done = false;
  export let id;

  const toggleTodo = () => {
    dispatch("todotoggle", {
      id,
      done: !done
    });
  };
</script>

<style>
  .done {
    text-decoration: line-through;
  }
</style>

<div on:click={toggleTodo}>
  {#if done}
    <p class="done">{label}</p>
  {:else}
    <p class="todo">{label}</p>
  {/if}
</div>