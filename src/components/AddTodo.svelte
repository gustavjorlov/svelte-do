<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  let errorMessage = "";

  const handleAdd = () => {
    const todoText = document.querySelector("#morestuff").value;
    if (todoText !== "") {
      errorMessage = "";
      dispatch("addtodo", { text: todoText });
      document.querySelector("#morestuff").value = "";
    } else errorMessage = "Plx add something to do";
  };
</script>

<style>
  .error {
    color: red;
  }
</style>

<button on:click={handleAdd}>+ Add</button>
<input id="morestuff" type="text" placeholder="More stuff" />
<p class="error">{errorMessage}</p>