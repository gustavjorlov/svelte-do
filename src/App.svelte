<script>
	import TodoList from "./components/TodoList.svelte";
	import AddTodo from "./components/AddTodo.svelte";
	import VisibilityFilter from "./components/VisibilityFilter.svelte";
	import {
	  toggleTodoForId,
	  removeTodoWithId
	} from "./helpers/todolist_helper.js";
	import { todos } from "./store.js";

	let todoCount,
	  visibilityFilter = "all";

	todos.subscribe(_todos => {
		console.log(_todos);
		todoCount = _todos.length;
	})

	const handleAdd = e => {
	  todos.update(_todos => [
	    ..._todos,
	    { id: _todos.length + 1, text: e.detail.text, done: false }
	  ]);
	};

	const handleToggle = (e, data) => {
	  todos.update(_todos => toggleTodoForId(_todos, e.detail.id));
	};

	const handleRemove = e => {
	  todos.update(_todos => removeTodoWithId(_todos, e.detail.id));
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
<TodoList 
	filter={visibilityFilter} 
	on:todotoggle={handleToggle} 
	on:todoremove={handleRemove} />
<VisibilityFilter on:visibilityChange={changeVisibility} />
