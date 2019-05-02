<script>
  import { createEventDispatcher } from "svelte";
  export let activeFilter = "all";
  const dispatch = createEventDispatcher();

  const changeTo = filter => () => {
    dispatch("visibilityChange", filter);
    activeFilter = filter;
  };
</script>

<style>
  span {
    border: 1px solid #cccccc;
    border-radius: 3px;
    padding: 3px 13px;
  }
  span:hover {
    cursor: pointer;
  }
  .active {
    border: none;
    border: 1px solid #ffffff;
  }
  .active:hover {
    cursor: default;
  }
</style>

<p>
  <span class={activeFilter === 'all' ? 'active' : ""} on:click={changeTo('all')}>All</span>
  <span  class={activeFilter === 'todo' ? 'active' : ""} on:click={changeTo('todo')}>Todo</span>
  <span class={activeFilter === 'done' ? 'active' : ""}  on:click={changeTo('done')}>Done</span>
</p>