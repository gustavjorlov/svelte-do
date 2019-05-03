<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  let errorMessage = "";
  let inputValue = "";

  const handleAdd = () => {
    dispatch("addtodo", { text: inputValue });
    inputValue = "";
  };
  const handleRemoveAll = () => {
    dispatch("removeall");
  };
</script>

<style>
  .error {
    color: red;
  }
</style>

<input bind:value={inputValue} type="text" />
<button on:click={handleAdd} disabled={inputValue === ""}>Add</button>
<button on:click={handleRemoveAll}>Remove All</button>