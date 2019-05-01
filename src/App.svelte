<script>
	import TodoList from "./components/TodoList.svelte";
	import VisibilityFilter from "./components/VisibilityFilter.svelte";
	import { toggleTodoForId } from "./helpers/todolist_helper.js";
	let todoCount,
	  todos = [],
	  visibilityFilter = "all";

	$: todoCount = todos.length;

	const handleAdd = () => {
	  todos = [...todos, { id: todos.length + 1, text: Date.now(), done: false }];
	};

	const handleToggle = (e, data) => {
	  todos = toggleTodoForId(todos, e.detail.id);
	};
	const changeVisibility = e => {
	  visibilityFilter = e.detail;
	};
</script>

<style>
	h1 {
	  color: purple;
	}
</style>

<h1>Todo (total {todoCount})</h1>
<button on:click={handleAdd}>+ Add</button>
<TodoList todoItems={todos} filter={visibilityFilter} on:todotoggle={handleToggle} />
<VisibilityFilter on:visibilityChange={changeVisibility} />
