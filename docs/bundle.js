
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	const identity = x => x;

	function assign(tar, src) {
		for (const k in src) tar[k] = src[k];
		return tar;
	}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function validate_store(store, name) {
		if (!store || typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(component, store, callback) {
		const unsub = store.subscribe(callback);

		component.$$.on_destroy.push(unsub.unsubscribe
			? () => unsub.unsubscribe()
			: unsub);
	}

	const tasks = new Set();
	let running = false;

	function run_tasks() {
		tasks.forEach(task => {
			if (!task[0](window.performance.now())) {
				tasks.delete(task);
				task[1]();
			}
		});

		running = tasks.size > 0;
		if (running) requestAnimationFrame(run_tasks);
	}

	function loop(fn) {
		let task;

		if (!running) {
			running = true;
			requestAnimationFrame(run_tasks);
		}

		return {
			promise: new Promise(fulfil => {
				tasks.add(task = [fn, fulfil]);
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	function custom_event(type, detail) {
		const e = document.createEvent('CustomEvent');
		e.initCustomEvent(type, false, false, detail);
		return e;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	function createEventDispatcher() {
		const component = current_component;

		return (type, detail) => {
			const callbacks = component.$$.callbacks[type];

			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(type, detail);
				callbacks.slice().forEach(fn => {
					fn.call(component, event);
				});
			}
		};
	}

	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	function bubble(component, event) {
		const callbacks = component.$$.callbacks[event.type];

		if (callbacks) {
			callbacks.slice().forEach(fn => fn(event));
		}
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	function outro_and_destroy_block(block, lookup) {
		on_outro(() => {
			destroy_block(block, lookup);
		});

		block.o(1);
	}

	function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
		let o = old_blocks.length;
		let n = list.length;

		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;

		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();

		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);

			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_lookup.set(key, new_blocks[i] = block);

			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}

		const will_move = new Set();
		const did_move = new Set();

		function insert(block) {
			if (block.i) block.i(1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}

		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;

			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			}

			else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			}

			else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			}

			else if (did_move.has(old_key)) {
				o--;

			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);

			} else {
				will_move.add(old_key);
				o--;
			}
		}

		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}

		while (n) insert(new_blocks[n - 1]);

		return new_blocks;
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = {};
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	/* src/components/TodoItem.svelte generated by Svelte v3.1.0 */

	const file = "src/components/TodoItem.svelte";

	function create_fragment(ctx) {
		var div, p0, t0, p0_class_value, t1, p1, dispose;

		return {
			c: function create() {
				div = element("div");
				p0 = element("p");
				t0 = text(ctx.label);
				t1 = space();
				p1 = element("p");
				p1.textContent = "-";
				p0.className = p0_class_value = "" + (ctx.done ? "done item": "todo item") + " svelte-ju9av0";
				add_location(p0, file, 58, 2, 995);
				p1.className = "remove svelte-ju9av0";
				add_location(p1, file, 59, 2, 1074);
				div.className = "svelte-ju9av0";
				add_location(div, file, 57, 0, 987);

				dispose = [
					listen(p0, "click", ctx.toggleTodo),
					listen(p1, "click", ctx.removeTodo)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, p0);
				append(p0, t0);
				append(div, t1);
				append(div, p1);
			},

			p: function update(changed, ctx) {
				if (changed.label) {
					set_data(t0, ctx.label);
				}

				if ((changed.done) && p0_class_value !== (p0_class_value = "" + (ctx.done ? "done item": "todo item") + " svelte-ju9av0")) {
					p0.className = p0_class_value;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				run_all(dispose);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		const dispatch = createEventDispatcher();

	  let { label = "-", done = false, id } = $$props;

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

		$$self.$set = $$props => {
			if ('label' in $$props) $$invalidate('label', label = $$props.label);
			if ('done' in $$props) $$invalidate('done', done = $$props.done);
			if ('id' in $$props) $$invalidate('id', id = $$props.id);
		};

		return { label, done, id, toggleTodo, removeTodo };
	}

	class TodoItem extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["label", "done", "id"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.label === undefined && !('label' in props)) {
				console.warn("<TodoItem> was created without expected prop 'label'");
			}
			if (ctx.done === undefined && !('done' in props)) {
				console.warn("<TodoItem> was created without expected prop 'done'");
			}
			if (ctx.id === undefined && !('id' in props)) {
				console.warn("<TodoItem> was created without expected prop 'id'");
			}
		}

		get label() {
			throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set label(value) {
			throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get done() {
			throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set done(value) {
			throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get id() {
			throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set id(value) {
			throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/**
	 * A special placeholder value used to specify "gaps" within curried functions,
	 * allowing partial application of any combination of arguments, regardless of
	 * their positions.
	 *
	 * If `g` is a curried ternary function and `_` is `R.__`, the following are
	 * equivalent:
	 *
	 *   - `g(1, 2, 3)`
	 *   - `g(_, 2, 3)(1)`
	 *   - `g(_, _, 3)(1)(2)`
	 *   - `g(_, _, 3)(1, 2)`
	 *   - `g(_, 2, _)(1, 3)`
	 *   - `g(_, 2)(1)(3)`
	 *   - `g(_, 2)(1, 3)`
	 *   - `g(_, 2)(_, 3)(1)`
	 *
	 * @name __
	 * @constant
	 * @memberOf R
	 * @since v0.6.0
	 * @category Function
	 * @example
	 *
	 *      const greet = R.replace('{name}', R.__, 'Hello, {name}!');
	 *      greet('Alice'); //=> 'Hello, Alice!'
	 */

	function _isPlaceholder(a) {
	       return a != null && typeof a === 'object' && a['@@functional/placeholder'] === true;
	}

	/**
	 * Optimized internal one-arity curry function.
	 *
	 * @private
	 * @category Function
	 * @param {Function} fn The function to curry.
	 * @return {Function} The curried function.
	 */
	function _curry1(fn) {
	  return function f1(a) {
	    if (arguments.length === 0 || _isPlaceholder(a)) {
	      return f1;
	    } else {
	      return fn.apply(this, arguments);
	    }
	  };
	}

	/**
	 * Optimized internal two-arity curry function.
	 *
	 * @private
	 * @category Function
	 * @param {Function} fn The function to curry.
	 * @return {Function} The curried function.
	 */
	function _curry2(fn) {
	  return function f2(a, b) {
	    switch (arguments.length) {
	      case 0:
	        return f2;
	      case 1:
	        return _isPlaceholder(a) ? f2 : _curry1(function (_b) {
	          return fn(a, _b);
	        });
	      default:
	        return _isPlaceholder(a) && _isPlaceholder(b) ? f2 : _isPlaceholder(a) ? _curry1(function (_a) {
	          return fn(_a, b);
	        }) : _isPlaceholder(b) ? _curry1(function (_b) {
	          return fn(a, _b);
	        }) : fn(a, b);
	    }
	  };
	}

	/**
	 * Private `concat` function to merge two array-like objects.
	 *
	 * @private
	 * @param {Array|Arguments} [set1=[]] An array-like object.
	 * @param {Array|Arguments} [set2=[]] An array-like object.
	 * @return {Array} A new, merged array.
	 * @example
	 *
	 *      _concat([4, 5, 6], [1, 2, 3]); //=> [4, 5, 6, 1, 2, 3]
	 */
	function _concat(set1, set2) {
	  set1 = set1 || [];
	  set2 = set2 || [];
	  var idx;
	  var len1 = set1.length;
	  var len2 = set2.length;
	  var result = [];

	  idx = 0;
	  while (idx < len1) {
	    result[result.length] = set1[idx];
	    idx += 1;
	  }
	  idx = 0;
	  while (idx < len2) {
	    result[result.length] = set2[idx];
	    idx += 1;
	  }
	  return result;
	}

	/**
	 * Optimized internal three-arity curry function.
	 *
	 * @private
	 * @category Function
	 * @param {Function} fn The function to curry.
	 * @return {Function} The curried function.
	 */
	function _curry3(fn) {
	  return function f3(a, b, c) {
	    switch (arguments.length) {
	      case 0:
	        return f3;
	      case 1:
	        return _isPlaceholder(a) ? f3 : _curry2(function (_b, _c) {
	          return fn(a, _b, _c);
	        });
	      case 2:
	        return _isPlaceholder(a) && _isPlaceholder(b) ? f3 : _isPlaceholder(a) ? _curry2(function (_a, _c) {
	          return fn(_a, b, _c);
	        }) : _isPlaceholder(b) ? _curry2(function (_b, _c) {
	          return fn(a, _b, _c);
	        }) : _curry1(function (_c) {
	          return fn(a, b, _c);
	        });
	      default:
	        return _isPlaceholder(a) && _isPlaceholder(b) && _isPlaceholder(c) ? f3 : _isPlaceholder(a) && _isPlaceholder(b) ? _curry2(function (_a, _b) {
	          return fn(_a, _b, c);
	        }) : _isPlaceholder(a) && _isPlaceholder(c) ? _curry2(function (_a, _c) {
	          return fn(_a, b, _c);
	        }) : _isPlaceholder(b) && _isPlaceholder(c) ? _curry2(function (_b, _c) {
	          return fn(a, _b, _c);
	        }) : _isPlaceholder(a) ? _curry1(function (_a) {
	          return fn(_a, b, c);
	        }) : _isPlaceholder(b) ? _curry1(function (_b) {
	          return fn(a, _b, c);
	        }) : _isPlaceholder(c) ? _curry1(function (_c) {
	          return fn(a, b, _c);
	        }) : fn(a, b, c);
	    }
	  };
	}

	/**
	 * Applies a function to the value at the given index of an array, returning a
	 * new copy of the array with the element at the given index replaced with the
	 * result of the function application.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.14.0
	 * @category List
	 * @sig Number -> (a -> a) -> [a] -> [a]
	 * @param {Number} idx The index.
	 * @param {Function} fn The function to apply.
	 * @param {Array|Arguments} list An array-like object whose value
	 *        at the supplied index will be replaced.
	 * @return {Array} A copy of the supplied array-like object with
	 *         the element at index `idx` replaced with the value
	 *         returned by applying `fn` to the existing element.
	 * @see R.update
	 * @example
	 *
	 *      R.adjust(1, R.toUpper, ['a', 'b', 'c', 'd']);      //=> ['a', 'B', 'c', 'd']
	 *      R.adjust(-1, R.toUpper, ['a', 'b', 'c', 'd']);     //=> ['a', 'b', 'c', 'D']
	 * @symb R.adjust(-1, f, [a, b]) = [a, f(b)]
	 * @symb R.adjust(0, f, [a, b]) = [f(a), b]
	 */
	var adjust = /*#__PURE__*/_curry3(function adjust(idx, fn, list) {
	  if (idx >= list.length || idx < -list.length) {
	    return list;
	  }
	  var start = idx < 0 ? list.length : 0;
	  var _idx = start + idx;
	  var _list = _concat(list);
	  _list[_idx] = fn(list[_idx]);
	  return _list;
	});

	/**
	 * Tests whether or not an object is an array.
	 *
	 * @private
	 * @param {*} val The object to test.
	 * @return {Boolean} `true` if `val` is an array, `false` otherwise.
	 * @example
	 *
	 *      _isArray([]); //=> true
	 *      _isArray(null); //=> false
	 *      _isArray({}); //=> false
	 */
	var _isArray = Array.isArray || function _isArray(val) {
	  return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
	};

	function _isTransformer(obj) {
	  return obj != null && typeof obj['@@transducer/step'] === 'function';
	}

	/**
	 * Returns a function that dispatches with different strategies based on the
	 * object in list position (last argument). If it is an array, executes [fn].
	 * Otherwise, if it has a function with one of the given method names, it will
	 * execute that function (functor case). Otherwise, if it is a transformer,
	 * uses transducer [xf] to return a new transformer (transducer case).
	 * Otherwise, it will default to executing [fn].
	 *
	 * @private
	 * @param {Array} methodNames properties to check for a custom implementation
	 * @param {Function} xf transducer to initialize if object is transformer
	 * @param {Function} fn default ramda implementation
	 * @return {Function} A function that dispatches on object in list position
	 */
	function _dispatchable(methodNames, xf, fn) {
	  return function () {
	    if (arguments.length === 0) {
	      return fn();
	    }
	    var args = Array.prototype.slice.call(arguments, 0);
	    var obj = args.pop();
	    if (!_isArray(obj)) {
	      var idx = 0;
	      while (idx < methodNames.length) {
	        if (typeof obj[methodNames[idx]] === 'function') {
	          return obj[methodNames[idx]].apply(obj, args);
	        }
	        idx += 1;
	      }
	      if (_isTransformer(obj)) {
	        var transducer = xf.apply(null, args);
	        return transducer(obj);
	      }
	    }
	    return fn.apply(this, arguments);
	  };
	}

	function _reduced(x) {
	  return x && x['@@transducer/reduced'] ? x : {
	    '@@transducer/value': x,
	    '@@transducer/reduced': true
	  };
	}

	var _xfBase = {
	  init: function () {
	    return this.xf['@@transducer/init']();
	  },
	  result: function (result) {
	    return this.xf['@@transducer/result'](result);
	  }
	};

	function _has(prop, obj) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	var toString = Object.prototype.toString;
	var _isArguments = /*#__PURE__*/function () {
	  return toString.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
	    return toString.call(x) === '[object Arguments]';
	  } : function _isArguments(x) {
	    return _has('callee', x);
	  };
	}();

	// cover IE < 9 keys issues
	var hasEnumBug = ! /*#__PURE__*/{ toString: null }.propertyIsEnumerable('toString');
	var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
	// Safari bug
	var hasArgsEnumBug = /*#__PURE__*/function () {

	  return arguments.propertyIsEnumerable('length');
	}();

	var contains = function contains(list, item) {
	  var idx = 0;
	  while (idx < list.length) {
	    if (list[idx] === item) {
	      return true;
	    }
	    idx += 1;
	  }
	  return false;
	};

	/**
	 * Returns a list containing the names of all the enumerable own properties of
	 * the supplied object.
	 * Note that the order of the output array is not guaranteed to be consistent
	 * across different JS platforms.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.1.0
	 * @category Object
	 * @sig {k: v} -> [k]
	 * @param {Object} obj The object to extract properties from
	 * @return {Array} An array of the object's own properties.
	 * @see R.keysIn, R.values
	 * @example
	 *
	 *      R.keys({a: 1, b: 2, c: 3}); //=> ['a', 'b', 'c']
	 */
	var keys = typeof Object.keys === 'function' && !hasArgsEnumBug ? /*#__PURE__*/_curry1(function keys(obj) {
	  return Object(obj) !== obj ? [] : Object.keys(obj);
	}) : /*#__PURE__*/_curry1(function keys(obj) {
	  if (Object(obj) !== obj) {
	    return [];
	  }
	  var prop, nIdx;
	  var ks = [];
	  var checkArgsLength = hasArgsEnumBug && _isArguments(obj);
	  for (prop in obj) {
	    if (_has(prop, obj) && (!checkArgsLength || prop !== 'length')) {
	      ks[ks.length] = prop;
	    }
	  }
	  if (hasEnumBug) {
	    nIdx = nonEnumerableProps.length - 1;
	    while (nIdx >= 0) {
	      prop = nonEnumerableProps[nIdx];
	      if (_has(prop, obj) && !contains(ks, prop)) {
	        ks[ks.length] = prop;
	      }
	      nIdx -= 1;
	    }
	  }
	  return ks;
	});

	/**
	 * Returns a function that always returns the given value. Note that for
	 * non-primitives the value returned is a reference to the original value.
	 *
	 * This function is known as `const`, `constant`, or `K` (for K combinator) in
	 * other languages and libraries.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.1.0
	 * @category Function
	 * @sig a -> (* -> a)
	 * @param {*} val The value to wrap in a function
	 * @return {Function} A Function :: * -> val.
	 * @example
	 *
	 *      const t = R.always('Tee');
	 *      t(); //=> 'Tee'
	 */
	var always = /*#__PURE__*/_curry1(function always(val) {
	  return function () {
	    return val;
	  };
	});

	/**
	 * Determine if the passed argument is an integer.
	 *
	 * @private
	 * @param {*} n
	 * @category Type
	 * @return {Boolean}
	 */

	/**
	 * Gives a single-word string description of the (native) type of a value,
	 * returning such answers as 'Object', 'Number', 'Array', or 'Null'. Does not
	 * attempt to distinguish user Object types any further, reporting them all as
	 * 'Object'.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.8.0
	 * @category Type
	 * @sig (* -> {*}) -> String
	 * @param {*} val The value to test
	 * @return {String}
	 * @example
	 *
	 *      R.type({}); //=> "Object"
	 *      R.type(1); //=> "Number"
	 *      R.type(false); //=> "Boolean"
	 *      R.type('s'); //=> "String"
	 *      R.type(null); //=> "Null"
	 *      R.type([]); //=> "Array"
	 *      R.type(/[A-z]/); //=> "RegExp"
	 *      R.type(() => {}); //=> "Function"
	 *      R.type(undefined); //=> "Undefined"
	 */
	var type = /*#__PURE__*/_curry1(function type(val) {
	  return val === null ? 'Null' : val === undefined ? 'Undefined' : Object.prototype.toString.call(val).slice(8, -1);
	});

	/**
	 * A function that returns the `!` of its argument. It will return `true` when
	 * passed false-y value, and `false` when passed a truth-y one.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.1.0
	 * @category Logic
	 * @sig * -> Boolean
	 * @param {*} a any value
	 * @return {Boolean} the logical inverse of passed argument.
	 * @see R.complement
	 * @example
	 *
	 *      R.not(true); //=> false
	 *      R.not(false); //=> true
	 *      R.not(0); //=> true
	 *      R.not(1); //=> false
	 */
	var not = /*#__PURE__*/_curry1(function not(a) {
	  return !a;
	});

	function _arrayFromIterator(iter) {
	  var list = [];
	  var next;
	  while (!(next = iter.next()).done) {
	    list.push(next.value);
	  }
	  return list;
	}

	function _includesWith(pred, x, list) {
	  var idx = 0;
	  var len = list.length;

	  while (idx < len) {
	    if (pred(x, list[idx])) {
	      return true;
	    }
	    idx += 1;
	  }
	  return false;
	}

	function _functionName(f) {
	  // String(x => x) evaluates to "x => x", so the pattern may not match.
	  var match = String(f).match(/^function (\w*)/);
	  return match == null ? '' : match[1];
	}

	// Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
	function _objectIs(a, b) {
	  // SameValue algorithm
	  if (a === b) {
	    // Steps 1-5, 7-10
	    // Steps 6.b-6.e: +0 != -0
	    return a !== 0 || 1 / a === 1 / b;
	  } else {
	    // Step 6.a: NaN == NaN
	    return a !== a && b !== b;
	  }
	}

	var _objectIs$1 = typeof Object.is === 'function' ? Object.is : _objectIs;

	/**
	 * private _uniqContentEquals function.
	 * That function is checking equality of 2 iterator contents with 2 assumptions
	 * - iterators lengths are the same
	 * - iterators values are unique
	 *
	 * false-positive result will be returned for comparision of, e.g.
	 * - [1,2,3] and [1,2,3,4]
	 * - [1,1,1] and [1,2,3]
	 * */

	function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
	  var a = _arrayFromIterator(aIterator);
	  var b = _arrayFromIterator(bIterator);

	  function eq(_a, _b) {
	    return _equals(_a, _b, stackA.slice(), stackB.slice());
	  }

	  // if *a* array contains any element that is not included in *b*
	  return !_includesWith(function (b, aItem) {
	    return !_includesWith(eq, aItem, b);
	  }, b, a);
	}

	function _equals(a, b, stackA, stackB) {
	  if (_objectIs$1(a, b)) {
	    return true;
	  }

	  var typeA = type(a);

	  if (typeA !== type(b)) {
	    return false;
	  }

	  if (a == null || b == null) {
	    return false;
	  }

	  if (typeof a['fantasy-land/equals'] === 'function' || typeof b['fantasy-land/equals'] === 'function') {
	    return typeof a['fantasy-land/equals'] === 'function' && a['fantasy-land/equals'](b) && typeof b['fantasy-land/equals'] === 'function' && b['fantasy-land/equals'](a);
	  }

	  if (typeof a.equals === 'function' || typeof b.equals === 'function') {
	    return typeof a.equals === 'function' && a.equals(b) && typeof b.equals === 'function' && b.equals(a);
	  }

	  switch (typeA) {
	    case 'Arguments':
	    case 'Array':
	    case 'Object':
	      if (typeof a.constructor === 'function' && _functionName(a.constructor) === 'Promise') {
	        return a === b;
	      }
	      break;
	    case 'Boolean':
	    case 'Number':
	    case 'String':
	      if (!(typeof a === typeof b && _objectIs$1(a.valueOf(), b.valueOf()))) {
	        return false;
	      }
	      break;
	    case 'Date':
	      if (!_objectIs$1(a.valueOf(), b.valueOf())) {
	        return false;
	      }
	      break;
	    case 'Error':
	      return a.name === b.name && a.message === b.message;
	    case 'RegExp':
	      if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
	        return false;
	      }
	      break;
	  }

	  var idx = stackA.length - 1;
	  while (idx >= 0) {
	    if (stackA[idx] === a) {
	      return stackB[idx] === b;
	    }
	    idx -= 1;
	  }

	  switch (typeA) {
	    case 'Map':
	      if (a.size !== b.size) {
	        return false;
	      }

	      return _uniqContentEquals(a.entries(), b.entries(), stackA.concat([a]), stackB.concat([b]));
	    case 'Set':
	      if (a.size !== b.size) {
	        return false;
	      }

	      return _uniqContentEquals(a.values(), b.values(), stackA.concat([a]), stackB.concat([b]));
	    case 'Arguments':
	    case 'Array':
	    case 'Object':
	    case 'Boolean':
	    case 'Number':
	    case 'String':
	    case 'Date':
	    case 'Error':
	    case 'RegExp':
	    case 'Int8Array':
	    case 'Uint8Array':
	    case 'Uint8ClampedArray':
	    case 'Int16Array':
	    case 'Uint16Array':
	    case 'Int32Array':
	    case 'Uint32Array':
	    case 'Float32Array':
	    case 'Float64Array':
	    case 'ArrayBuffer':
	      break;
	    default:
	      // Values of other types are only equal if identical.
	      return false;
	  }

	  var keysA = keys(a);
	  if (keysA.length !== keys(b).length) {
	    return false;
	  }

	  var extendedStackA = stackA.concat([a]);
	  var extendedStackB = stackB.concat([b]);

	  idx = keysA.length - 1;
	  while (idx >= 0) {
	    var key = keysA[idx];
	    if (!(_has(key, b) && _equals(b[key], a[key], extendedStackA, extendedStackB))) {
	      return false;
	    }
	    idx -= 1;
	  }
	  return true;
	}

	/**
	 * Returns `true` if its arguments are equivalent, `false` otherwise. Handles
	 * cyclical data structures.
	 *
	 * Dispatches symmetrically to the `equals` methods of both arguments, if
	 * present.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.15.0
	 * @category Relation
	 * @sig a -> b -> Boolean
	 * @param {*} a
	 * @param {*} b
	 * @return {Boolean}
	 * @example
	 *
	 *      R.equals(1, 1); //=> true
	 *      R.equals(1, '1'); //=> false
	 *      R.equals([1, 2, 3], [1, 2, 3]); //=> true
	 *
	 *      const a = {}; a.v = a;
	 *      const b = {}; b.v = b;
	 *      R.equals(a, b); //=> true
	 */
	var equals = /*#__PURE__*/_curry2(function equals(a, b) {
	  return _equals(a, b, [], []);
	});

	/**
	 * Polyfill from <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString>.
	 */

	/**
	 * Returns a new copy of the array with the element at the provided index
	 * replaced with the given value.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.14.0
	 * @category List
	 * @sig Number -> a -> [a] -> [a]
	 * @param {Number} idx The index to update.
	 * @param {*} x The value to exist at the given index of the returned array.
	 * @param {Array|Arguments} list The source array-like object to be updated.
	 * @return {Array} A copy of `list` with the value at index `idx` replaced with `x`.
	 * @see R.adjust
	 * @example
	 *
	 *      R.update(1, '_', ['a', 'b', 'c']);      //=> ['a', '_', 'c']
	 *      R.update(-1, '_', ['a', 'b', 'c']);     //=> ['a', 'b', '_']
	 * @symb R.update(-1, a, [b, c]) = [b, a]
	 * @symb R.update(0, a, [b, c]) = [a, c]
	 * @symb R.update(1, a, [b, c]) = [b, a]
	 */
	var update$1 = /*#__PURE__*/_curry3(function update(idx, x, list) {
	  return adjust(idx, always(x), list);
	});

	/**
	 * Creates a new object by recursively evolving a shallow copy of `object`,
	 * according to the `transformation` functions. All non-primitive properties
	 * are copied by reference.
	 *
	 * A `transformation` function will not be invoked if its corresponding key
	 * does not exist in the evolved object.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.9.0
	 * @category Object
	 * @sig {k: (v -> v)} -> {k: v} -> {k: v}
	 * @param {Object} transformations The object specifying transformation functions to apply
	 *        to the object.
	 * @param {Object} object The object to be transformed.
	 * @return {Object} The transformed object.
	 * @example
	 *
	 *      const tomato = {firstName: '  Tomato ', data: {elapsed: 100, remaining: 1400}, id:123};
	 *      const transformations = {
	 *        firstName: R.trim,
	 *        lastName: R.trim, // Will not get invoked.
	 *        data: {elapsed: R.add(1), remaining: R.add(-1)}
	 *      };
	 *      R.evolve(transformations, tomato); //=> {firstName: 'Tomato', data: {elapsed: 101, remaining: 1399}, id:123}
	 */
	var evolve = /*#__PURE__*/_curry2(function evolve(transformations, object) {
	  var result = object instanceof Array ? [] : {};
	  var transformation, key, type;
	  for (key in object) {
	    transformation = transformations[key];
	    type = typeof transformation;
	    result[key] = type === 'function' ? transformation(object[key]) : transformation && type === 'object' ? evolve(transformation, object[key]) : object[key];
	  }
	  return result;
	});

	var XFindIndex = /*#__PURE__*/function () {
	  function XFindIndex(f, xf) {
	    this.xf = xf;
	    this.f = f;
	    this.idx = -1;
	    this.found = false;
	  }
	  XFindIndex.prototype['@@transducer/init'] = _xfBase.init;
	  XFindIndex.prototype['@@transducer/result'] = function (result) {
	    if (!this.found) {
	      result = this.xf['@@transducer/step'](result, -1);
	    }
	    return this.xf['@@transducer/result'](result);
	  };
	  XFindIndex.prototype['@@transducer/step'] = function (result, input) {
	    this.idx += 1;
	    if (this.f(input)) {
	      this.found = true;
	      result = _reduced(this.xf['@@transducer/step'](result, this.idx));
	    }
	    return result;
	  };

	  return XFindIndex;
	}();

	var _xfindIndex = /*#__PURE__*/_curry2(function _xfindIndex(f, xf) {
	  return new XFindIndex(f, xf);
	});

	/**
	 * Returns the index of the first element of the list which matches the
	 * predicate, or `-1` if no element matches.
	 *
	 * Acts as a transducer if a transformer is given in list position.
	 *
	 * @func
	 * @memberOf R
	 * @since v0.1.1
	 * @category List
	 * @sig (a -> Boolean) -> [a] -> Number
	 * @param {Function} fn The predicate function used to determine if the element is the
	 * desired one.
	 * @param {Array} list The array to consider.
	 * @return {Number} The index of the element found, or `-1`.
	 * @see R.transduce
	 * @example
	 *
	 *      const xs = [{a: 1}, {a: 2}, {a: 3}];
	 *      R.findIndex(R.propEq('a', 2))(xs); //=> 1
	 *      R.findIndex(R.propEq('a', 4))(xs); //=> -1
	 */
	var findIndex = /*#__PURE__*/_curry2( /*#__PURE__*/_dispatchable([], _xfindIndex, function findIndex(fn, list) {
	  var idx = 0;
	  var len = list.length;
	  while (idx < len) {
	    if (fn(list[idx])) {
	      return idx;
	    }
	    idx += 1;
	  }
	  return -1;
	}));

	/**
	 * Returns `true` if the specified object property is equal, in
	 * [`R.equals`](#equals) terms, to the given value; `false` otherwise.
	 * You can test multiple properties with [`R.whereEq`](#whereEq).
	 *
	 * @func
	 * @memberOf R
	 * @since v0.1.0
	 * @category Relation
	 * @sig String -> a -> Object -> Boolean
	 * @param {String} name
	 * @param {*} val
	 * @param {*} obj
	 * @return {Boolean}
	 * @see R.whereEq, R.propSatisfies, R.equals
	 * @example
	 *
	 *      const abby = {name: 'Abby', age: 7, hair: 'blond'};
	 *      const fred = {name: 'Fred', age: 12, hair: 'brown'};
	 *      const rusty = {name: 'Rusty', age: 10, hair: 'brown'};
	 *      const alois = {name: 'Alois', age: 15, disposition: 'surly'};
	 *      const kids = [abby, fred, rusty, alois];
	 *      const hasBrownHair = R.propEq('hair', 'brown');
	 *      R.filter(hasBrownHair, kids); //=> [fred, rusty]
	 */
	var propEq = /*#__PURE__*/_curry3(function propEq(name, val, obj) {
	  return equals(val, obj[name]);
	});

	const toggleTodoForId = (todos, id) => {
	  const arrayId = findIndex(propEq("id", id))(todos);
	  return update$1(
	    arrayId,
	    evolve({
	      done: not
	    })(todos[arrayId]),
	    todos
	  );
	};

	const getVisibleTodos = (filter, todos) => {
	  switch (filter) {
	    case "todo":
	      return todos.filter(item => !item.done);
	    case "done":
	      return todos.filter(item => item.done);
	    default:
	      return todos;
	  }
	};

	const removeTodoWithId = (todos, id) => {
	  return todos.filter(todo => todo.id !== id);
	};

	function writable(value, start = noop) {
		let stop;
		const subscribers = [];

		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (!stop) return; // not ready
				subscribers.forEach(s => s[1]());
				subscribers.forEach(s => s[0](value));
			}
		}

		function update(fn) {
			set(fn(value));
		}

		function subscribe(run, invalidate = noop) {
			const subscriber = [run, invalidate];
			subscribers.push(subscriber);
			if (subscribers.length === 1) stop = start(set) || noop;
			run(value);

			return () => {
				const index = subscribers.indexOf(subscriber);
				if (index !== -1) subscribers.splice(index, 1);
				if (subscribers.length === 0) stop();
			};
		}

		return { set, update, subscribe };
	}

	const initialState = window.localStorage.getItem("todos");
	console.log(JSON.parse(initialState));

	const todos = writable((initialState && JSON.parse(initialState)) || []);

	todos.subscribe(_todos => {
	  window.localStorage.setItem("todos", JSON.stringify(_todos));
	});

	/* src/components/TodoList.svelte generated by Svelte v3.1.0 */

	const file$1 = "src/components/TodoList.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.item = list[i];
		return child_ctx;
	}

	// (31:2) {#each visibleTodos as item (item.id)}
	function create_each_block(key_1, ctx) {
		var li, t, current;

		var todoitem = new TodoItem({
			props: {
			id: ctx.item.id,
			label: ctx.item.text,
			done: ctx.item.done
		},
			$$inline: true
		});
		todoitem.$on("todotoggle", ctx.todotoggle_handler);
		todoitem.$on("todoremove", ctx.todoremove_handler);

		return {
			key: key_1,

			first: null,

			c: function create() {
				li = element("li");
				todoitem.$$.fragment.c();
				t = space();
				add_location(li, file$1, 31, 4, 700);
				this.first = li;
			},

			m: function mount(target, anchor) {
				insert(target, li, anchor);
				mount_component(todoitem, li, null);
				append(li, t);
				current = true;
			},

			p: function update(changed, ctx) {
				var todoitem_changes = {};
				if (changed.visibleTodos) todoitem_changes.id = ctx.item.id;
				if (changed.visibleTodos) todoitem_changes.label = ctx.item.text;
				if (changed.visibleTodos) todoitem_changes.done = ctx.item.done;
				todoitem.$set(todoitem_changes);
			},

			i: function intro(local) {
				if (current) return;
				todoitem.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				todoitem.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(li);
				}

				todoitem.$destroy();
			}
		};
	}

	function create_fragment$1(ctx) {
		var ul, each_blocks = [], each_1_lookup = new Map(), current;

		var each_value = ctx.visibleTodos;

		const get_key = ctx => ctx.item.id;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		return {
			c: function create() {
				ul = element("ul");

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
				ul.className = "svelte-5cb1r1";
				add_location(ul, file$1, 29, 0, 650);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, ul, anchor);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(ul, null);

				current = true;
			},

			p: function update(changed, ctx) {
				const each_value = ctx.visibleTodos;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block, null, get_each_context);
				check_outros();
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].o();

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(ul);
				}

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	  let { filter = "all" } = $$props;
	  let visibleTodos;
	  let unsubscribe;
	  onDestroy(() => {
	    console.log("Unsubscribing todos store");
	    unsubscribe();
	  });

		function todotoggle_handler(event) {
			bubble($$self, event);
		}

		function todoremove_handler(event) {
			bubble($$self, event);
		}

		$$self.$set = $$props => {
			if ('filter' in $$props) $$invalidate('filter', filter = $$props.filter);
		};

		$$self.$$.update = ($$dirty = { filter: 1 }) => {
			if ($$dirty.filter) { $$invalidate('unsubscribe', unsubscribe = todos.subscribe(updatedTodos => {
	        $$invalidate('visibleTodos', visibleTodos = getVisibleTodos(filter, updatedTodos));
	      })); }
		};

		return {
			filter,
			visibleTodos,
			todotoggle_handler,
			todoremove_handler
		};
	}

	class TodoList extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["filter"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.filter === undefined && !('filter' in props)) {
				console.warn("<TodoList> was created without expected prop 'filter'");
			}
		}

		get filter() {
			throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set filter(value) {
			throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/components/AddTodo.svelte generated by Svelte v3.1.0 */

	const file$2 = "src/components/AddTodo.svelte";

	function create_fragment$2(ctx) {
		var input, t0, button0, t1, button0_disabled_value, t2, button1, dispose;

		return {
			c: function create() {
				input = element("input");
				t0 = space();
				button0 = element("button");
				t1 = text("Add");
				t2 = space();
				button1 = element("button");
				button1.textContent = "Remove All";
				attr(input, "type", "text");
				add_location(input, file$2, 21, 0, 379);
				button0.disabled = button0_disabled_value = ctx.inputValue === "";
				add_location(button0, file$2, 22, 0, 425);
				add_location(button1, file$2, 23, 0, 496);

				dispose = [
					listen(input, "input", ctx.input_input_handler),
					listen(button0, "click", ctx.handleAdd),
					listen(button1, "click", ctx.handleRemoveAll)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, input, anchor);

				input.value = ctx.inputValue;

				insert(target, t0, anchor);
				insert(target, button0, anchor);
				append(button0, t1);
				insert(target, t2, anchor);
				insert(target, button1, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.inputValue && (input.value !== ctx.inputValue)) input.value = ctx.inputValue;

				if ((changed.inputValue) && button0_disabled_value !== (button0_disabled_value = ctx.inputValue === "")) {
					button0.disabled = button0_disabled_value;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(input);
					detach(t0);
					detach(button0);
					detach(t2);
					detach(button1);
				}

				run_all(dispose);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		const dispatch = createEventDispatcher();
	  let inputValue = "";

	  const handleAdd = () => {
	    dispatch("addtodo", { text: inputValue });
	    $$invalidate('inputValue', inputValue = "");
	  };
	  const handleRemoveAll = () => {
	    dispatch("removeall");
	  };

		function input_input_handler() {
			inputValue = this.value;
			$$invalidate('inputValue', inputValue);
		}

		return {
			inputValue,
			handleAdd,
			handleRemoveAll,
			input_input_handler
		};
	}

	class AddTodo extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
		}
	}

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	function cubicOut(t) {
		var f = t - 1.0;
		return f * f * f + 1.0;
	}

	function is_date(obj) {
		return Object.prototype.toString.call(obj) === '[object Date]';
	}

	function get_interpolator(a, b) {
		if (a === b || a !== a) return () => a;

		const type = typeof a;

		if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
			throw new Error('Cannot interpolate values of different type');
		}

		if (Array.isArray(a)) {
			const arr = b.map((bi, i) => {
				return get_interpolator(a[i], bi);
			});

			return t => arr.map(fn => fn(t));
		}

		if (type === 'object') {
			if (!a || !b) throw new Error('Object cannot be null');

			if (is_date(a) && is_date(b)) {
				a = a.getTime();
				b = b.getTime();
				const delta = b - a;
				return t => new Date(a + t * delta);
			}

			const keys = Object.keys(b);
			const interpolators = {};

			keys.forEach(key => {
				interpolators[key] = get_interpolator(a[key], b[key]);
			});

			return t => {
				const result = {};
				keys.forEach(key => {
					result[key] = interpolators[key](t);
				});
				return result;
			};
		}

		if (type === 'number') {
			const delta = b - a;
			return t => a + t * delta;
		}

		throw new Error(`Cannot interpolate ${type} values`);
	}

	function tweened(value, defaults = {}) {
		const store = writable(value);

		let task;
		let target_value = value;

		function set(new_value, opts) {
			target_value = new_value;

			let previous_task = task;
			let started = false;

			let {
				delay = 0,
				duration = 400,
				easing = identity,
				interpolate = get_interpolator
			} = assign(assign({}, defaults), opts);

			const start = window.performance.now() + delay;
			let fn;

			task = loop(now => {
				if (now < start) return true;

				if (!started) {
					fn = interpolate(value, new_value);
					if (typeof duration === 'function') duration = duration(value, new_value);
					started = true;
				}

				if (previous_task) {
					previous_task.abort();
					previous_task = null;
				}

				const elapsed = now - start;

				if (elapsed > duration) {
					store.set(value = new_value);
					return false;
				}

				store.set(value = fn(easing(elapsed / duration)));
				return true;
			});

			return task.promise;
		}

		return {
			set,
			update: (fn, opts) => set(fn(target_value, value), opts),
			subscribe: store.subscribe
		};
	}

	/* src/components/ProgressBar.svelte generated by Svelte v3.1.0 */

	const file$3 = "src/components/ProgressBar.svelte";

	function create_fragment$3(ctx) {
		var progress_1, t0, h3, t1, t2, t3, t4;

		return {
			c: function create() {
				progress_1 = element("progress");
				t0 = space();
				h3 = element("h3");
				t1 = text(ctx.done);
				t2 = text(" of ");
				t3 = text(ctx.all);
				t4 = text(" done");
				progress_1.value = ctx.$progress;
				progress_1.max = ctx.all;
				progress_1.className = "svelte-12wjn2t";
				add_location(progress_1, file$3, 27, 0, 437);
				h3.className = "svelte-12wjn2t";
				add_location(h3, file$3, 28, 0, 487);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, progress_1, anchor);
				insert(target, t0, anchor);
				insert(target, h3, anchor);
				append(h3, t1);
				append(h3, t2);
				append(h3, t3);
				append(h3, t4);
			},

			p: function update(changed, ctx) {
				if (changed.$progress) {
					progress_1.value = ctx.$progress;
				}

				if (changed.all) {
					progress_1.max = ctx.all;
					set_data(t3, ctx.all);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(progress_1);
					detach(t0);
					detach(h3);
				}
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let $todos, $progress;

		validate_store(todos, 'todos');
		subscribe($$self, todos, $$value => { $todos = $$value; $$invalidate('$todos', $todos); });

		

	  let progress = tweened(0, {
	    duration: 400,
	    easing: cubicOut,
	    delay: 200
	  }); validate_store(progress, 'progress'); subscribe($$self, progress, $$value => { $progress = $$value; $$invalidate('$progress', $progress); });

	  let done = 0,
	    all = 0;

		$$self.$$.update = ($$dirty = { progress: 1, $todos: 1 }) => {
			if ($$dirty.progress || $$dirty.$todos) { progress.set($todos.filter(i => i.done).length); }
			if ($$dirty.$todos) { $$invalidate('all', all = $todos.length); }
		};

		return { progress, done, all, $progress };
	}

	class ProgressBar extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
		}
	}

	/* src/components/VisibilityFilter.svelte generated by Svelte v3.1.0 */

	const file$4 = "src/components/VisibilityFilter.svelte";

	function create_fragment$4(ctx) {
		var p, span0, t0, t1_value = ctx.counts.all, t1, t2, span0_class_value, t3, span1, t4, t5_value = ctx.counts.todo, t5, t6, span1_class_value, t7, span2, t8, t9_value = ctx.counts.done, t9, t10, span2_class_value, dispose;

		return {
			c: function create() {
				p = element("p");
				span0 = element("span");
				t0 = text("All (");
				t1 = text(t1_value);
				t2 = text(")");
				t3 = space();
				span1 = element("span");
				t4 = text("Todo (");
				t5 = text(t5_value);
				t6 = text(")");
				t7 = space();
				span2 = element("span");
				t8 = text("Done (");
				t9 = text(t9_value);
				t10 = text(")");
				span0.className = span0_class_value = "" + (ctx.activeFilter === 'all' ? 'active' : "") + " svelte-kauhz8";
				add_location(span0, file$4, 43, 2, 958);
				span1.className = span1_class_value = "" + (ctx.activeFilter === 'todo' ? 'active' : "") + " svelte-kauhz8";
				add_location(span1, file$4, 44, 2, 1066);
				span2.className = span2_class_value = "" + (ctx.activeFilter === 'done' ? 'active' : "") + " svelte-kauhz8";
				add_location(span2, file$4, 45, 2, 1178);
				add_location(p, file$4, 42, 0, 952);

				dispose = [
					listen(span0, "click", ctx.changeTo('all')),
					listen(span1, "click", ctx.changeTo('todo')),
					listen(span2, "click", ctx.changeTo('done'))
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, p, anchor);
				append(p, span0);
				append(span0, t0);
				append(span0, t1);
				append(span0, t2);
				append(p, t3);
				append(p, span1);
				append(span1, t4);
				append(span1, t5);
				append(span1, t6);
				append(p, t7);
				append(p, span2);
				append(span2, t8);
				append(span2, t9);
				append(span2, t10);
			},

			p: function update(changed, ctx) {
				if ((changed.counts) && t1_value !== (t1_value = ctx.counts.all)) {
					set_data(t1, t1_value);
				}

				if ((changed.activeFilter) && span0_class_value !== (span0_class_value = "" + (ctx.activeFilter === 'all' ? 'active' : "") + " svelte-kauhz8")) {
					span0.className = span0_class_value;
				}

				if ((changed.counts) && t5_value !== (t5_value = ctx.counts.todo)) {
					set_data(t5, t5_value);
				}

				if ((changed.activeFilter) && span1_class_value !== (span1_class_value = "" + (ctx.activeFilter === 'todo' ? 'active' : "") + " svelte-kauhz8")) {
					span1.className = span1_class_value;
				}

				if ((changed.counts) && t9_value !== (t9_value = ctx.counts.done)) {
					set_data(t9, t9_value);
				}

				if ((changed.activeFilter) && span2_class_value !== (span2_class_value = "" + (ctx.activeFilter === 'done' ? 'active' : "") + " svelte-kauhz8")) {
					span2.className = span2_class_value;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(p);
				}

				run_all(dispose);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		
	  let { activeFilter = "all" } = $$props;
	  const dispatch = createEventDispatcher();

	  const changeTo = filter => () => {
	    dispatch("visibilityChange", filter);
	    $$invalidate('activeFilter', activeFilter = filter);
	  };
	  let counts = { all: 0, todo: 0, done: 0 };
	  const unsubscribe = todos.subscribe(_todos => {
	    $$invalidate('counts', counts = { all: 0, todo: 0, done: 0 });
	    _todos.reduce((acc, item) => {
	      counts[item.done ? "done" : "todo"] += 1; $$invalidate('counts', counts);
	    }, []);
	    counts.all = _todos.length; $$invalidate('counts', counts);
	  });
	  onDestroy(() => {
	    console.log("Unsubrcibing VisibilityFilter from todo updates");
	    unsubscribe();
	  });

		$$self.$set = $$props => {
			if ('activeFilter' in $$props) $$invalidate('activeFilter', activeFilter = $$props.activeFilter);
		};

		return { activeFilter, changeTo, counts };
	}

	class VisibilityFilter extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, ["activeFilter"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.activeFilter === undefined && !('activeFilter' in props)) {
				console.warn("<VisibilityFilter> was created without expected prop 'activeFilter'");
			}
		}

		get activeFilter() {
			throw new Error("<VisibilityFilter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set activeFilter(value) {
			throw new Error("<VisibilityFilter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/App.svelte generated by Svelte v3.1.0 */

	const file$5 = "src/App.svelte";

	// (58:0) {:else}
	function create_else_block(ctx) {
		var h3;

		return {
			c: function create() {
				h3 = element("h3");
				h3.textContent = "TODO: Add some todos";
				add_location(h3, file$5, 58, 1, 1312);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(h3);
				}
			}
		};
	}

	// (51:0) {#if todoItems.length > 0}
	function create_if_block(ctx) {
		var t0, t1, current;

		var progressbar = new ProgressBar({ $$inline: true });

		var todolist = new TodoList({
			props: { filter: ctx.visibilityFilter },
			$$inline: true
		});
		todolist.$on("todotoggle", ctx.handleToggle);
		todolist.$on("todoremove", ctx.handleRemove);

		var visibilityfilter = new VisibilityFilter({ $$inline: true });
		visibilityfilter.$on("visibilityChange", ctx.changeVisibility);

		return {
			c: function create() {
				progressbar.$$.fragment.c();
				t0 = space();
				todolist.$$.fragment.c();
				t1 = space();
				visibilityfilter.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(progressbar, target, anchor);
				insert(target, t0, anchor);
				mount_component(todolist, target, anchor);
				insert(target, t1, anchor);
				mount_component(visibilityfilter, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var todolist_changes = {};
				if (changed.visibilityFilter) todolist_changes.filter = ctx.visibilityFilter;
				todolist.$set(todolist_changes);
			},

			i: function intro(local) {
				if (current) return;
				progressbar.$$.fragment.i(local);

				todolist.$$.fragment.i(local);

				visibilityfilter.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				progressbar.$$.fragment.o(local);
				todolist.$$.fragment.o(local);
				visibilityfilter.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				progressbar.$destroy(detaching);

				if (detaching) {
					detach(t0);
				}

				todolist.$destroy(detaching);

				if (detaching) {
					detach(t1);
				}

				visibilityfilter.$destroy(detaching);
			}
		};
	}

	function create_fragment$5(ctx) {
		var h1, t1, t2, current_block_type_index, if_block, if_block_anchor, current;

		var addtodo = new AddTodo({ $$inline: true });
		addtodo.$on("addtodo", ctx.handleAdd);
		addtodo.$on("removeall", ctx.handleRemoveAll);

		var if_block_creators = [
			create_if_block,
			create_else_block
		];

		var if_blocks = [];

		function select_block_type(ctx) {
			if (ctx.todoItems.length > 0) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Todo";
				t1 = space();
				addtodo.$$.fragment.c();
				t2 = space();
				if_block.c();
				if_block_anchor = empty();
				h1.className = "svelte-12l0t9d";
				add_location(h1, file$5, 48, 0, 1017);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, h1, anchor);
				insert(target, t1, anchor);
				mount_component(addtodo, target, anchor);
				insert(target, t2, anchor);
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);
				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(changed, ctx);
				} else {
					group_outros();
					on_outro(() => {
						if_blocks[previous_block_index].d(1);
						if_blocks[previous_block_index] = null;
					});
					if_block.o(1);
					check_outros();

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}
					if_block.i(1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},

			i: function intro(local) {
				if (current) return;
				addtodo.$$.fragment.i(local);

				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				addtodo.$$.fragment.o(local);
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(h1);
					detach(t1);
				}

				addtodo.$destroy(detaching);

				if (detaching) {
					detach(t2);
				}

				if_blocks[current_block_type_index].d(detaching);

				if (detaching) {
					detach(if_block_anchor);
				}
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		

		let visibilityFilter = "all",
		  todoItems = [];

		todos.subscribe(_todos => {
		  $$invalidate('todoItems', todoItems = _todos);
		});

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

		const handleRemoveAll = () => {
		  todos.set([]);
		};

		const changeVisibility = e => {
		  $$invalidate('visibilityFilter', visibilityFilter = e.detail);
		};

		return {
			visibilityFilter,
			todoItems,
			handleAdd,
			handleToggle,
			handleRemove,
			handleRemoveAll,
			changeVisibility
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body,
		props: {
			name: 'world'
		}
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
