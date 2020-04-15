
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
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
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
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
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (150:2) {:else}
    function create_else_block_1(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "UPDATE";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "DELETE";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "BACK";
    			attr_dev(button0, "class", "svelte-1bb7xsf");
    			add_location(button0, file, 151, 4, 3835);
    			attr_dev(button1, "class", "svelte-1bb7xsf");
    			add_location(button1, file, 152, 4, 3900);
    			attr_dev(button2, "class", "svelte-1bb7xsf");
    			add_location(button2, file, 153, 4, 3965);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button2, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", prevent_default(/*userUpdate*/ ctx[9]), false, true, false),
    				listen_dev(button1, "click", prevent_default(/*userDelete*/ ctx[10]), false, true, false),
    				listen_dev(button2, "click", prevent_default(/*back*/ ctx[12]), false, true, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(150:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (148:2) {#if state == 'ADD'}
    function create_if_block_1(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "ADD";
    			attr_dev(button, "class", "svelte-1bb7xsf");
    			add_location(button, file, 148, 4, 3765);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", prevent_default(/*userAdd*/ ctx[7]), false, true, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(148:2) {#if state == 'ADD'}",
    		ctx
    	});

    	return block;
    }

    // (180:2) {:else}
    function create_else_block(ctx) {
    	let each_1_anchor;

    	let each_value = /*search*/ ctx[5] == ""
    	? /*users*/ ctx[2]
    	: /*filteredUser*/ ctx[6];

    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*userEdit, search, users, filteredUser*/ 356) {
    				each_value = /*search*/ ctx[5] == ""
    				? /*users*/ ctx[2]
    				: /*filteredUser*/ ctx[6];

    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(180:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (176:2) {#if users.length == 0}
    function create_if_block(ctx) {
    	let tr;
    	let th;
    	let center;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th = element("th");
    			center = element("center");
    			center.textContent = "NO DATA";
    			attr_dev(center, "class", "svelte-1bb7xsf");
    			add_location(center, file, 177, 20, 4499);
    			attr_dev(th, "colspan", "5");
    			attr_dev(th, "class", "svelte-1bb7xsf");
    			add_location(th, file, 177, 4, 4483);
    			attr_dev(tr, "class", "svelte-1bb7xsf");
    			add_location(tr, file, 176, 2, 4474);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th);
    			append_dev(th, center);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(176:2) {#if users.length == 0}",
    		ctx
    	});

    	return block;
    }

    // (181:4) {#each (search == '' ? users : filteredUser) as u}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*u*/ ctx[20]._Username + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*u*/ ctx[20]._Password + "";
    	let t2;
    	let t3;
    	let td2;

    	let t4_value = (/*u*/ ctx[20].StudentNo == ""
    	? null
    	: /*u*/ ctx[20].StudentNo) + "";

    	let t4;
    	let t5;
    	let td3;
    	let t6_value = (/*u*/ ctx[20].isActive ? "true" : "false") + "";
    	let t6;
    	let t7;
    	let td4;
    	let button;
    	let t9;
    	let dispose;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			button = element("button");
    			button.textContent = "EDIT";
    			t9 = space();
    			attr_dev(td0, "class", "svelte-1bb7xsf");
    			add_location(td0, file, 182, 8, 4621);
    			attr_dev(td1, "class", "svelte-1bb7xsf");
    			add_location(td1, file, 183, 8, 4652);
    			attr_dev(td2, "class", "svelte-1bb7xsf");
    			add_location(td2, file, 184, 8, 4684);
    			attr_dev(td3, "class", "svelte-1bb7xsf");
    			add_location(td3, file, 185, 8, 4742);
    			attr_dev(button, "class", "svelte-1bb7xsf");
    			add_location(button, file, 186, 12, 4795);
    			attr_dev(td4, "class", "svelte-1bb7xsf");
    			add_location(td4, file, 186, 8, 4791);
    			attr_dev(tr, "class", "svelte-1bb7xsf");
    			add_location(tr, file, 181, 6, 4608);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, button);
    			append_dev(tr, t9);
    			if (remount) dispose();

    			dispose = listen_dev(
    				button,
    				"click",
    				prevent_default(function () {
    					if (is_function(/*userEdit*/ ctx[8](/*u*/ ctx[20]))) /*userEdit*/ ctx[8](/*u*/ ctx[20]).apply(this, arguments);
    				}),
    				false,
    				true,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*search, users, filteredUser*/ 100 && t0_value !== (t0_value = /*u*/ ctx[20]._Username + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*search, users, filteredUser*/ 100 && t2_value !== (t2_value = /*u*/ ctx[20]._Password + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*search, users, filteredUser*/ 100 && t4_value !== (t4_value = (/*u*/ ctx[20].StudentNo == ""
    			? null
    			: /*u*/ ctx[20].StudentNo) + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*search, users, filteredUser*/ 100 && t6_value !== (t6_value = (/*u*/ ctx[20].isActive ? "true" : "false") + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(181:4) {#each (search == '' ? users : filteredUser) as u}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let title_value;
    	let t0;
    	let h1;
    	let t2;
    	let form;
    	let label0;
    	let t4;
    	let input0;
    	let input0_class_value;
    	let t5;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let label2;
    	let t10;
    	let input2;
    	let t11;
    	let label3;
    	let t13;
    	let input3;
    	let t14;
    	let br0;
    	let t15;
    	let t16;
    	let ul;
    	let li0;
    	let t17;
    	let t18_value = /*user*/ ctx[1]._Username + "";
    	let t18;
    	let t19;
    	let li1;
    	let t20;
    	let t21_value = /*user*/ ctx[1]._Password + "";
    	let t21;
    	let t22;
    	let li2;
    	let t23;
    	let t24_value = /*user*/ ctx[1].StudentNo + "";
    	let t24;
    	let t25;
    	let li3;
    	let t26;
    	let t27_value = /*user*/ ctx[1].isActive + "";
    	let t27;
    	let t28;
    	let br1;
    	let t29;
    	let li4;
    	let t30;
    	let t31_value = /*users*/ ctx[2].length + "";
    	let t31;
    	let t32;
    	let input4;
    	let t33;
    	let table;
    	let tr;
    	let th0;
    	let t35;
    	let th1;
    	let t37;
    	let th2;
    	let t39;
    	let th3;
    	let t41;
    	let th4;
    	let t43;
    	let t44;
    	let h3;
    	let dispose;
    	document.title = title_value = /*title*/ ctx[0];

    	function select_block_type(ctx, dirty) {
    		if (/*state*/ ctx[3] == "ADD") return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*users*/ ctx[2].length == 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "USERS";
    			t2 = space();
    			form = element("form");
    			label0 = element("label");
    			label0.textContent = "Username";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Password";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "StudentNo";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "Active";
    			t13 = space();
    			input3 = element("input");
    			t14 = space();
    			br0 = element("br");
    			t15 = space();
    			if_block0.c();
    			t16 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t17 = text("Username: ");
    			t18 = text(t18_value);
    			t19 = space();
    			li1 = element("li");
    			t20 = text("Password: ");
    			t21 = text(t21_value);
    			t22 = space();
    			li2 = element("li");
    			t23 = text("Student No: ");
    			t24 = text(t24_value);
    			t25 = space();
    			li3 = element("li");
    			t26 = text("isActive: ");
    			t27 = text(t27_value);
    			t28 = space();
    			br1 = element("br");
    			t29 = space();
    			li4 = element("li");
    			t30 = text("COUNT: ");
    			t31 = text(t31_value);
    			t32 = space();
    			input4 = element("input");
    			t33 = space();
    			table = element("table");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Username";
    			t35 = space();
    			th1 = element("th");
    			th1.textContent = "Password";
    			t37 = space();
    			th2 = element("th");
    			th2.textContent = "Student No";
    			t39 = space();
    			th3 = element("th");
    			th3.textContent = "isActive";
    			t41 = space();
    			th4 = element("th");
    			th4.textContent = "Action";
    			t43 = space();
    			if_block1.c();
    			t44 = space();
    			h3 = element("h3");
    			h3.textContent = "X";
    			attr_dev(h1, "class", "svelte-1bb7xsf");
    			add_location(h1, file, 136, 0, 3110);
    			attr_dev(label0, "for", "_Username");
    			attr_dev(label0, "id", "_Username");
    			attr_dev(label0, "class", "svelte-1bb7xsf");
    			add_location(label0, file, 138, 2, 3135);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "_Username");
    			attr_dev(input0, "placeholder", "Username");

    			attr_dev(input0, "class", input0_class_value = "" + (null_to_empty(/*exist*/ ctx[4] && /*state*/ ctx[3] == "ADD"
    			? "invalid"
    			: "valid") + " svelte-1bb7xsf"));

    			add_location(input0, file, 139, 2, 3192);
    			attr_dev(label1, "for", "_Password");
    			attr_dev(label1, "class", "svelte-1bb7xsf");
    			add_location(label1, file, 140, 2, 3353);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "_Password");
    			attr_dev(input1, "placeholder", "Password");
    			attr_dev(input1, "class", "svelte-1bb7xsf");
    			add_location(input1, file, 141, 2, 3395);
    			attr_dev(label2, "for", "StudentNo");
    			attr_dev(label2, "class", "svelte-1bb7xsf");
    			add_location(label2, file, 142, 2, 3487);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "StudentNo");
    			attr_dev(input2, "placeholder", "StudentNo");
    			attr_dev(input2, "class", "svelte-1bb7xsf");
    			add_location(input2, file, 143, 2, 3530);
    			attr_dev(label3, "for", "isActive");
    			attr_dev(label3, "class", "svelte-1bb7xsf");
    			add_location(label3, file, 144, 4, 3621);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "id", "isActive");
    			attr_dev(input3, "class", "svelte-1bb7xsf");
    			add_location(input3, file, 145, 4, 3662);
    			attr_dev(br0, "class", "svelte-1bb7xsf");
    			add_location(br0, file, 146, 4, 3733);
    			attr_dev(form, "class", "svelte-1bb7xsf");
    			add_location(form, file, 137, 0, 3125);
    			attr_dev(li0, "class", "svelte-1bb7xsf");
    			add_location(li0, file, 158, 2, 4042);
    			attr_dev(li1, "class", "svelte-1bb7xsf");
    			add_location(li1, file, 159, 2, 4080);
    			attr_dev(li2, "class", "svelte-1bb7xsf");
    			add_location(li2, file, 160, 2, 4118);
    			attr_dev(li3, "class", "svelte-1bb7xsf");
    			add_location(li3, file, 161, 2, 4158);
    			attr_dev(br1, "class", "svelte-1bb7xsf");
    			add_location(br1, file, 162, 2, 4195);
    			attr_dev(li4, "class", "svelte-1bb7xsf");
    			add_location(li4, file, 163, 2, 4202);
    			attr_dev(ul, "class", "svelte-1bb7xsf");
    			add_location(ul, file, 157, 0, 4035);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "placeholder", "Search by Username");
    			attr_dev(input4, "class", "svelte-1bb7xsf");
    			add_location(input4, file, 166, 0, 4240);
    			attr_dev(th0, "class", "svelte-1bb7xsf");
    			add_location(th0, file, 169, 4, 4332);
    			attr_dev(th1, "class", "svelte-1bb7xsf");
    			add_location(th1, file, 170, 4, 4354);
    			attr_dev(th2, "class", "svelte-1bb7xsf");
    			add_location(th2, file, 171, 4, 4376);
    			attr_dev(th3, "class", "svelte-1bb7xsf");
    			add_location(th3, file, 172, 4, 4400);
    			attr_dev(th4, "class", "svelte-1bb7xsf");
    			add_location(th4, file, 173, 4, 4422);
    			attr_dev(tr, "class", "svelte-1bb7xsf");
    			add_location(tr, file, 168, 2, 4323);
    			attr_dev(table, "class", "svelte-1bb7xsf");
    			add_location(table, file, 167, 0, 4313);
    			attr_dev(h3, "class", "svelte-1bb7xsf");
    			add_location(h3, file, 191, 0, 4901);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, label0);
    			append_dev(form, t4);
    			append_dev(form, input0);
    			set_input_value(input0, /*user*/ ctx[1]._Username);
    			append_dev(form, t5);
    			append_dev(form, label1);
    			append_dev(form, t7);
    			append_dev(form, input1);
    			set_input_value(input1, /*user*/ ctx[1]._Password);
    			append_dev(form, t8);
    			append_dev(form, label2);
    			append_dev(form, t10);
    			append_dev(form, input2);
    			set_input_value(input2, /*user*/ ctx[1].StudentNo);
    			append_dev(form, t11);
    			append_dev(form, label3);
    			append_dev(form, t13);
    			append_dev(form, input3);
    			input3.checked = /*user*/ ctx[1].isActive;
    			append_dev(form, t14);
    			append_dev(form, br0);
    			append_dev(form, t15);
    			if_block0.m(form, null);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, t17);
    			append_dev(li0, t18);
    			append_dev(ul, t19);
    			append_dev(ul, li1);
    			append_dev(li1, t20);
    			append_dev(li1, t21);
    			append_dev(ul, t22);
    			append_dev(ul, li2);
    			append_dev(li2, t23);
    			append_dev(li2, t24);
    			append_dev(ul, t25);
    			append_dev(ul, li3);
    			append_dev(li3, t26);
    			append_dev(li3, t27);
    			append_dev(ul, t28);
    			append_dev(ul, br1);
    			append_dev(ul, t29);
    			append_dev(ul, li4);
    			append_dev(li4, t30);
    			append_dev(li4, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, input4, anchor);
    			set_input_value(input4, /*search*/ ctx[5]);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t35);
    			append_dev(tr, th1);
    			append_dev(tr, t37);
    			append_dev(tr, th2);
    			append_dev(tr, t39);
    			append_dev(tr, th3);
    			append_dev(tr, t41);
    			append_dev(tr, th4);
    			append_dev(table, t43);
    			if_block1.m(table, null);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, h3, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[15]),
    				listen_dev(input0, "input", /*userExist*/ ctx[11], false, false, false),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[16]),
    				listen_dev(input2, "input", /*input2_input_handler*/ ctx[17]),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[18]),
    				listen_dev(input4, "input", /*input4_input_handler*/ ctx[19])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 1 && title_value !== (title_value = /*title*/ ctx[0])) {
    				document.title = title_value;
    			}

    			if (dirty & /*exist, state*/ 24 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*exist*/ ctx[4] && /*state*/ ctx[3] == "ADD"
    			? "invalid"
    			: "valid") + " svelte-1bb7xsf"))) {
    				attr_dev(input0, "class", input0_class_value);
    			}

    			if (dirty & /*user*/ 2 && input0.value !== /*user*/ ctx[1]._Username) {
    				set_input_value(input0, /*user*/ ctx[1]._Username);
    			}

    			if (dirty & /*user*/ 2 && input1.value !== /*user*/ ctx[1]._Password) {
    				set_input_value(input1, /*user*/ ctx[1]._Password);
    			}

    			if (dirty & /*user*/ 2 && input2.value !== /*user*/ ctx[1].StudentNo) {
    				set_input_value(input2, /*user*/ ctx[1].StudentNo);
    			}

    			if (dirty & /*user*/ 2) {
    				input3.checked = /*user*/ ctx[1].isActive;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(form, null);
    				}
    			}

    			if (dirty & /*user*/ 2 && t18_value !== (t18_value = /*user*/ ctx[1]._Username + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*user*/ 2 && t21_value !== (t21_value = /*user*/ ctx[1]._Password + "")) set_data_dev(t21, t21_value);
    			if (dirty & /*user*/ 2 && t24_value !== (t24_value = /*user*/ ctx[1].StudentNo + "")) set_data_dev(t24, t24_value);
    			if (dirty & /*user*/ 2 && t27_value !== (t27_value = /*user*/ ctx[1].isActive + "")) set_data_dev(t27, t27_value);
    			if (dirty & /*users*/ 4 && t31_value !== (t31_value = /*users*/ ctx[2].length + "")) set_data_dev(t31, t31_value);

    			if (dirty & /*search*/ 32 && input4.value !== /*search*/ ctx[5]) {
    				set_input_value(input4, /*search*/ ctx[5]);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(table, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(form);
    			if_block0.d();
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(ul);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(input4);
    			if (detaching) detach_dev(t33);
    			if (detaching) detach_dev(table);
    			if_block1.d();
    			if (detaching) detach_dev(t44);
    			if (detaching) detach_dev(h3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let user = {};
    	let users = [];
    	let state = "ADD";
    	let exist = false;
    	let search = "";

    	const userGetAll = async () => {
    		clearUser();
    		let res = await fetch("http://localhost:3000/api/user");
    		$$invalidate(2, users = await res.json());
    	};

    	const userAdd = async () => {
    		if (user._Username == "" || user._Password == "") return alert(`Please fill out form.`);

    		let res = await fetch("http://localhost:3000/api/user", {
    			method: "POST",
    			headers: { "Content-type": "application/json" },
    			body: JSON.stringify(user)
    		});

    		let result = await res.json();
    		$$invalidate(2, users = [...users, user]);
    		console.log(`New user ${user._Username} aded.`);
    		alert(`New user ${user._Username} aded.`);
    		clearUser();
    	};

    	const userEdit = u => {
    		$$invalidate(3, state = "EDIT");
    		$$invalidate(1, user = u);
    	};

    	const userUpdate = async () => {
    		let ans = confirm(`Are you sure you want to update ${user._Username}?`);
    		if (!ans) return alert(`Update cancelled.`);

    		let res = await fetch(`http://localhost:3000/api/user/`, {
    			method: "PATCH",
    			headers: { "Content-type": "application/json" },
    			body: JSON.stringify(user)
    		});

    		let result = await res.json();
    		let index = users.findIndex(u => u.ID == user.ID);
    		$$invalidate(2, users[index] = user, users);
    		console.log(`User '${user._Username}' updated!`);
    		alert(`User '${user._Username}' updated!`);
    		back();
    	};

    	const userDelete = async () => {
    		let ans = confirm(`Are you sure you want to delete '${user._Username}'?`);
    		if (!ans) return alert(`Deletion cancelled.`);

    		let res = await fetch(`http://localhost:3000/api/user/${user.ID}`, {
    			method: "DELETE",
    			headers: { "Content-type": "application/json" },
    			body: JSON.stringify(user)
    		});

    		let result = await res.json();
    		$$invalidate(2, users = users.filter(u => u.ID != user.ID));
    		console.log(`User '${user._Username}' deleted!`);
    		alert(`User '${user._Username}' deleted!`);
    		clearUser();
    	};

    	const userExist = async () => {
    		let userExist = users.filter(u => u._Username == user._Username);
    		if (userExist.length == 0) $$invalidate(4, exist = false); else $$invalidate(4, exist = true);
    	};

    	const back = () => {
    		clearUser();
    		$$invalidate(3, state = "ADD");
    	};

    	const clearUser = () => {
    		$$invalidate(1, user = {
    			_Username: "",
    			_Password: "",
    			StudentNo: "",
    			isActive: true
    		});
    	};

    	onMount(() => userGetAll());
    	const writable_props = ["title"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		user._Username = this.value;
    		$$invalidate(1, user);
    	}

    	function input1_input_handler() {
    		user._Password = this.value;
    		$$invalidate(1, user);
    	}

    	function input2_input_handler() {
    		user.StudentNo = this.value;
    		$$invalidate(1, user);
    	}

    	function input3_change_handler() {
    		user.isActive = this.checked;
    		$$invalidate(1, user);
    	}

    	function input4_input_handler() {
    		search = this.value;
    		$$invalidate(5, search);
    	}

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    	};

    	$$self.$capture_state = () => ({
    		title,
    		onMount,
    		user,
    		users,
    		state,
    		exist,
    		search,
    		userGetAll,
    		userAdd,
    		userEdit,
    		userUpdate,
    		userDelete,
    		userExist,
    		back,
    		clearUser,
    		filteredUser
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("user" in $$props) $$invalidate(1, user = $$props.user);
    		if ("users" in $$props) $$invalidate(2, users = $$props.users);
    		if ("state" in $$props) $$invalidate(3, state = $$props.state);
    		if ("exist" in $$props) $$invalidate(4, exist = $$props.exist);
    		if ("search" in $$props) $$invalidate(5, search = $$props.search);
    		if ("filteredUser" in $$props) $$invalidate(6, filteredUser = $$props.filteredUser);
    	};

    	let filteredUser;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*users, search*/ 36) {
    			/* $: filteredUser = users.filter(u => u._Username == search); */
    			 $$invalidate(6, filteredUser = users.filter(u => u._Username.indexOf(search) != -1));
    		}
    	};

    	return [
    		title,
    		user,
    		users,
    		state,
    		exist,
    		search,
    		filteredUser,
    		userAdd,
    		userEdit,
    		userUpdate,
    		userDelete,
    		userExist,
    		back,
    		userGetAll,
    		clearUser,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_change_handler,
    		input4_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console_1.warn("<App> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
        title: 'AMS - COMMITS',
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
