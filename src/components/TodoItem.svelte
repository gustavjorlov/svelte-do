<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
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
  const removeTodo = () => {
    dispatch("todoremove", { id });
  };

  onDestroy(() => {
    console.log("I got destroyed", label);
  });
  onMount(() => {
    console.log("I mounted", label);
  });
</script>

<style>
  div {
    display: flex;
  }
  p {
    padding: 10px;
    border-radius: 20px;
  }
  .item:hover {
    background: #efefef;
    cursor: pointer;
  }
  .done {
    text-decoration: line-through;
  }
  .remove {
    display: inline;
    transition: 0.4s;
    border-radius: 20px;
    height: 8px;
    position: relative;
    top: 5px;
    line-height: 7px;
    font-weight: bold;
  }
  .remove:hover {
    cursor: pointer;
    background: rgb(245, 157, 157);
  }
</style>

<div>
  <p on:click={toggleTodo} class={done ? "done item": "todo item"}>{label}</p>
  <p on:click={removeTodo} class="remove">-</p>
</div>