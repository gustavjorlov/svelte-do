<script>
  import { todos } from "../store.js";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  let progress = tweened(0, {
    duration: 400,
    easing: cubicOut,
    delay: 200
  });

  let done = 0,
    all = 0;

  $: progress.set($todos.filter(i => i.done).length);
  $: all = $todos.length;
</script>

<style>
  progress {
    display: block;
  }
  h3 {
    display: inline;
  }
</style>

<progress value={$progress} max={all}></progress>
<h3>{done} of {all} done</h3>