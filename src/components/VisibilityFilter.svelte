<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  const changeTo = filter => () => {
    dispatch("visibilityChange", filter);
  };
</script>

<p>
  <span on:click={changeTo('all')}>All</span>
  <span on:click={changeTo('todo')}>Todo</span>
  <span on:click={changeTo('done')}>Done</span>
</p>