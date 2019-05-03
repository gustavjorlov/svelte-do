import { writable } from "svelte/store";

const initialState = window.localStorage.getItem("todos");
console.log(JSON.parse(initialState));

export const todos = writable((initialState && JSON.parse(initialState)) || []);

todos.subscribe(_todos => {
  window.localStorage.setItem("todos", JSON.stringify(_todos));
});
