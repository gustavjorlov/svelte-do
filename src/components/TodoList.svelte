<script>
  import TodoItem from "./TodoItem.svelte";
  import { getVisibleTodos } from "../helpers/todolist_helper.js";

  export let todoItems = [];
  export let filter = "all";
  const handleToggle = (e, data) => {
    console.log("derp", e.detail);
  };
  let visibleTodos;
  $: visibleTodos = getVisibleTodos(filter, todoItems);
</script>

<ul>
  {#each visibleTodos as item (item.id)}
    <li>
      <TodoItem 
        id={item.id} 
        label={item.text} 
        done={item.done} 
        on:todotoggle 
      />
    </li>
  {/each}
</ul>