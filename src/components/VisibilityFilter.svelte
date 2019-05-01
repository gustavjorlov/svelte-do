<script>
  import { createEventDispatcher } from "svelte";
  export let activeFilter = 'all';
  const dispatch = createEventDispatcher();

  const changeTo = filter => () => {
    dispatch("visibilityChange", filter);
  };
</script>

<style>
  span {
    border: 1px solid #cccccc;
    border-radius: 3px;
    padding: 3px;
  }
  span:hover {
    cursor: pointer;
  }
</style>

<p>
  <span on:click={changeTo('all')}>All</span>
  <span on:click={changeTo('todo')}>Todo</span>
  <span on:click={changeTo('done')}>Done</span>
</p>