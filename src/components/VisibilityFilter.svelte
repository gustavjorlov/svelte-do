<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import { todos } from "../store.js";
  export let activeFilter = "all";
  const dispatch = createEventDispatcher();

  const changeTo = filter => () => {
    dispatch("visibilityChange", filter);
    activeFilter = filter;
  };
  let counts = { all: 0, todo: 0, done: 0 };
  const unsubscribe = todos.subscribe(_todos => {
    counts = { all: 0, todo: 0, done: 0 };
    _todos.reduce((acc, item) => {
      counts[item.done ? "done" : "todo"] += 1;
    }, []);
    counts.all = _todos.length;
  });
  onDestroy(() => {
    console.log("Unsubrcibing VisibilityFilter from todo updates");
    unsubscribe();
  });
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
  <span class={activeFilter === 'all' ? 'active' : ""} on:click={changeTo('all')}>All ({counts.all})</span>
  <span class={activeFilter === 'todo' ? 'active' : ""} on:click={changeTo('todo')}>Todo ({counts.todo})</span>
  <span class={activeFilter === 'done' ? 'active' : ""}  on:click={changeTo('done')}>Done ({counts.done})</span>
</p>