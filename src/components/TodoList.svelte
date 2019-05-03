<script>
  import TodoItem from "./TodoItem.svelte";
  import { onDestroy } from "svelte";
  import { getVisibleTodos } from "../helpers/todolist_helper.js";
  import { todos } from "../store.js";

  export let filter = "all";
  const handleToggle = (e, data) => {
    console.log("derp", e.detail);
  };
  let visibleTodos;
  let unsubscribe;
  $: unsubscribe = todos.subscribe(updatedTodos => {
    visibleTodos = getVisibleTodos(filter, updatedTodos);
  });
  onDestroy(() => {
    console.log("Unsubscribing todos store");
    unsubscribe();
  });
</script>

<style>
  ul {
    width: 300px;
    list-style: none;
    padding: 0px;
  }
</style>

<ul>
  {#each visibleTodos as item (item.id)}
    <li>
      <TodoItem 
        id={item.id} 
        label={item.text} 
        done={item.done} 
        on:todotoggle
        on:todoremove
      />
    </li>
  {/each}
</ul>