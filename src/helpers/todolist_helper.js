import * as R from "ramda";

export const toggleTodoForId = (todos, id) => {
  const arrayId = R.findIndex(R.propEq("id", id))(todos);
  return R.update(
    arrayId,
    R.evolve({
      done: R.not
    })(todos[arrayId]),
    todos
  );
};

export const getVisibleTodos = (filter, todos) => {
  console.log("getVisibleTodos");
  switch (filter) {
    case "todo":
      return todos.filter(item => !item.done);
    case "done":
      return todos.filter(item => item.done);
    default:
      return todos;
  }
};
