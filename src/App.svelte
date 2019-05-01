<script>
	import TodoList from "./components/TodoList.svelte";
	import AddTodo from "./components/AddTodo.svelte";
	import VisibilityFilter from "./components/VisibilityFilter.svelte";
	import { toggleTodoForId } from "./helpers/todolist_helper.js";
	let todoCount,
	  todos = [],
	  visibilityFilter = "all";

	$: todoCount = todos.length;

	const handleAdd = e => {
	  todos = [
	    ...todos,
	    { id: todos.length + 1, text: e.detail.text, done: false }
	  ];
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
<AddTodo on:addtodo={handleAdd} />
<TodoList todoItems={todos} filter={visibilityFilter} on:todotoggle={handleToggle} />
<VisibilityFilter on:visibilityChange={changeVisibility} />
