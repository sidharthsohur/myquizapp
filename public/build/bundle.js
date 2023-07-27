
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35732/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
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
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    const file = "src\\App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    // (143:2) {:else}
    function create_else_block(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let t4;
    	let t5_value = /*questions*/ ctx[9].length + "";
    	let t5;
    	let t6;
    	let button;
    	let t8;
    	let t9;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showHighScores*/ ctx[7] && create_if_block_5(ctx);
    	let if_block1 = /*showShareButton*/ ctx[8] && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Quiz Completed";
    			t1 = space();
    			p = element("p");
    			t2 = text("Your Score: ");
    			t3 = text(/*score*/ ctx[2]);
    			t4 = text("/");
    			t5 = text(t5_value);
    			t6 = space();
    			button = element("button");
    			button.textContent = "Restart Quiz";
    			t8 = space();
    			if (if_block0) if_block0.c();
    			t9 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h2, "class", "svelte-5g7pu8");
    			add_location(h2, file, 144, 6, 4019);
    			attr_dev(p, "class", "svelte-5g7pu8");
    			add_location(p, file, 145, 6, 4049);
    			attr_dev(button, "class", "svelte-5g7pu8");
    			add_location(button, file, 146, 6, 4101);
    			attr_dev(div, "class", "score svelte-5g7pu8");
    			add_location(div, file, 143, 4, 3993);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(div, t6);
    			append_dev(div, button);
    			append_dev(div, t8);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t9);
    			if (if_block1) if_block1.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*restartQuiz*/ ctx[12], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*score*/ 4) set_data_dev(t3, /*score*/ ctx[2]);

    			if (/*showHighScores*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div, t9);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showShareButton*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(143:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (122:2) {#if currentQuestion < questions.length}
    function create_if_block(ctx) {
    	let div1;
    	let h2;
    	let t0_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].question + "";
    	let t0;
    	let t1;
    	let div0;
    	let t2;
    	let t3;
    	let t4;
    	let each_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].options;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*showExplanation*/ ctx[3] && create_if_block_3(ctx);
    	let if_block1 = /*showHint*/ ctx[4] && create_if_block_2(ctx);
    	let if_block2 = /*showTimer*/ ctx[5] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(h2, "class", "svelte-5g7pu8");
    			add_location(h2, file, 123, 6, 3376);
    			attr_dev(div0, "class", "options svelte-5g7pu8");
    			add_location(div0, file, 124, 6, 3429);
    			attr_dev(div1, "class", "question svelte-5g7pu8");
    			add_location(div1, file, 122, 4, 3347);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(h2, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			append_dev(div1, t2);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t4);
    			if (if_block2) if_block2.m(div1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentQuestion*/ 1 && t0_value !== (t0_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].question + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*userAnswers, currentQuestion, answerQuestion, questions*/ 2563) {
    				each_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].options;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*showExplanation*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div1, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showHint*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div1, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*showTimer*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(122:2) {#if currentQuestion < questions.length}",
    		ctx
    	});

    	return block;
    }

    // (148:6) {#if showHighScores}
    function create_if_block_5(ctx) {
    	let h3;
    	let t1;
    	let ol;
    	let each_value_1 = /*highScores*/ ctx[10];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "High Scores";
    			t1 = space();
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h3, file, 148, 8, 4189);
    			add_location(ol, file, 149, 8, 4218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ol, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ol, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*highScores*/ 1024) {
    				each_value_1 = /*highScores*/ ctx[10];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ol, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ol);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(148:6) {#if showHighScores}",
    		ctx
    	});

    	return block;
    }

    // (151:10) {#each highScores as highScore}
    function create_each_block_1(ctx) {
    	let li;
    	let t0_value = /*highScore*/ ctx[22].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*highScore*/ ctx[22].score + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			add_location(li, file, 151, 12, 4277);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(151:10) {#each highScores as highScore}",
    		ctx
    	});

    	return block;
    }

    // (156:6) {#if showShareButton}
    function create_if_block_4(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Share Results";
    			attr_dev(button, "class", "svelte-5g7pu8");
    			add_location(button, file, 156, 8, 4402);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*shareResults*/ ctx[13], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(156:6) {#if showShareButton}",
    		ctx
    	});

    	return block;
    }

    // (126:8) {#each questions[currentQuestion].options as option, index}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*option*/ ctx[19] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[14](/*index*/ ctx[21]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "svelte-5g7pu8");
    			toggle_class(button, "selected", /*userAnswers*/ ctx[1][/*currentQuestion*/ ctx[0]] === /*index*/ ctx[21]);
    			add_location(button, file, 126, 10, 3529);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*currentQuestion*/ 1 && t_value !== (t_value = /*option*/ ctx[19] + "")) set_data_dev(t, t_value);

    			if (dirty & /*userAnswers, currentQuestion*/ 3) {
    				toggle_class(button, "selected", /*userAnswers*/ ctx[1][/*currentQuestion*/ ctx[0]] === /*index*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(126:8) {#each questions[currentQuestion].options as option, index}",
    		ctx
    	});

    	return block;
    }

    // (133:6) {#if showExplanation}
    function create_if_block_3(ctx) {
    	let p;
    	let t_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].explanation + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "svelte-5g7pu8");
    			add_location(p, file, 133, 8, 3750);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentQuestion*/ 1 && t_value !== (t_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].explanation + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(133:6) {#if showExplanation}",
    		ctx
    	});

    	return block;
    }

    // (136:6) {#if showHint}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].hint + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "svelte-5g7pu8");
    			add_location(p, file, 136, 8, 3839);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentQuestion*/ 1 && t_value !== (t_value = /*questions*/ ctx[9][/*currentQuestion*/ ctx[0]].hint + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(136:6) {#if showHint}",
    		ctx
    	});

    	return block;
    }

    // (139:6) {#if showTimer}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Time left: ");
    			t1 = text(/*timer*/ ctx[6]);
    			t2 = text(" seconds");
    			attr_dev(p, "class", "svelte-5g7pu8");
    			add_location(p, file, 139, 8, 3922);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*timer*/ 64) set_data_dev(t1, /*timer*/ ctx[6]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(139:6) {#if showTimer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*currentQuestion*/ ctx[0] < /*questions*/ ctx[9].length) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Quiz App";
    			t1 = space();
    			if_block.c();
    			attr_dev(h1, "class", "svelte-5g7pu8");
    			add_location(h1, file, 120, 2, 3282);
    			attr_dev(main, "class", "svelte-5g7pu8");
    			add_location(main, file, 119, 0, 3273);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	let questions = [
    		{
    			question: "What is the capital of France?",
    			options: ["London", "Paris", "Berlin", "Madrid"],
    			correctIndex: 1,
    			explanation: "Paris is the capital of France.",
    			hint: "The city is known for its iconic Eiffel Tower.",
    			difficulty: "easy"
    		},
    		{
    			question: "Which planet is known as the Red Planet?",
    			options: ["Mars", "Venus", "Mercury", "Jupiter"],
    			correctIndex: 0
    		},
    		{
    			question: "Who painted the Mona Lisa?",
    			options: ["Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh", "Michelangelo"],
    			correctIndex: 0
    		},
    		{
    			question: "What is the largest organ in the human body?",
    			options: ["Skin", "Heart", "Liver", "Brain"],
    			correctIndex: 0
    		},
    		{
    			question: "What is the largest continent in the world?",
    			options: ["Asia", "Africa", "North America", "Europe"],
    			correctIndex: 0
    		}
    	];

    	let currentQuestion = 0;
    	let userAnswers = new Array(questions.length).fill(null);
    	let score = 0;
    	let showExplanation = false;
    	let showHint = false;
    	let showTimer = false;
    	let timer = 0;
    	let intervalId = null;
    	let showHighScores = false;
    	let highScores = [];
    	let showShareButton = false;

    	function answerQuestion(index) {
    		$$invalidate(1, userAnswers[currentQuestion] = index, userAnswers);

    		if (index === questions[currentQuestion].correctIndex) {
    			$$invalidate(2, score++, score);
    		}

    		$$invalidate(0, currentQuestion++, currentQuestion);
    		$$invalidate(3, showExplanation = false);
    		$$invalidate(4, showHint = false);

    		if (currentQuestion < questions.length) {
    			// Prepare for the next question
    			clearInterval(intervalId);

    			$$invalidate(5, showTimer = false);
    			$$invalidate(6, timer = 0);
    		} else {
    			// Quiz completed
    			$$invalidate(7, showHighScores = true);

    			$$invalidate(8, showShareButton = true);

    			// Save the user's score in the high scores list (assuming we have a user object with a name property)
    			highScores.push({ name: "User", score });

    			// Sort high scores in descending order
    			highScores.sort((a, b) => b.score - a.score);
    		}
    	}

    	function restartQuiz() {
    		$$invalidate(0, currentQuestion = 0);
    		$$invalidate(1, userAnswers = new Array(questions.length).fill(null));
    		$$invalidate(2, score = 0);
    		$$invalidate(3, showExplanation = false);
    		$$invalidate(4, showHint = false);
    		$$invalidate(5, showTimer = false);
    		$$invalidate(6, timer = 0);
    		clearInterval(intervalId);
    		$$invalidate(7, showHighScores = false);
    		$$invalidate(8, showShareButton = false);
    	}

    	function startTimer() {
    		$$invalidate(5, showTimer = true);
    		$$invalidate(6, timer = 10); // Set the timer duration (in seconds) for each question

    		intervalId = setInterval(
    			() => {
    				$$invalidate(6, timer--, timer);

    				if (timer <= 0) {
    					clearInterval(intervalId);
    					answerQuestion(null); // Call this to move to the next question when time's up
    				}
    			},
    			1000
    		);
    	}

    	function showExplanationForCurrentQuestion() {
    		$$invalidate(3, showExplanation = true);
    	}

    	function showHintForCurrentQuestion() {
    		$$invalidate(4, showHint = true);
    	}

    	function shareResults() {
    		const quizURL = "https://myquizapp.com";
    		const quote = "I scored " + score + " out of " + questions.length + " in the quiz! Try it out! #QuizApp";
    		const facebookShareURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(quizURL)}&quote=${encodeURIComponent(quote)}`;
    		window.open(facebookShareURL, "_blank");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = index => answerQuestion(index);

    	$$self.$capture_state = () => ({
    		questions,
    		currentQuestion,
    		userAnswers,
    		score,
    		showExplanation,
    		showHint,
    		showTimer,
    		timer,
    		intervalId,
    		showHighScores,
    		highScores,
    		showShareButton,
    		answerQuestion,
    		restartQuiz,
    		startTimer,
    		showExplanationForCurrentQuestion,
    		showHintForCurrentQuestion,
    		shareResults
    	});

    	$$self.$inject_state = $$props => {
    		if ('questions' in $$props) $$invalidate(9, questions = $$props.questions);
    		if ('currentQuestion' in $$props) $$invalidate(0, currentQuestion = $$props.currentQuestion);
    		if ('userAnswers' in $$props) $$invalidate(1, userAnswers = $$props.userAnswers);
    		if ('score' in $$props) $$invalidate(2, score = $$props.score);
    		if ('showExplanation' in $$props) $$invalidate(3, showExplanation = $$props.showExplanation);
    		if ('showHint' in $$props) $$invalidate(4, showHint = $$props.showHint);
    		if ('showTimer' in $$props) $$invalidate(5, showTimer = $$props.showTimer);
    		if ('timer' in $$props) $$invalidate(6, timer = $$props.timer);
    		if ('intervalId' in $$props) intervalId = $$props.intervalId;
    		if ('showHighScores' in $$props) $$invalidate(7, showHighScores = $$props.showHighScores);
    		if ('highScores' in $$props) $$invalidate(10, highScores = $$props.highScores);
    		if ('showShareButton' in $$props) $$invalidate(8, showShareButton = $$props.showShareButton);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentQuestion,
    		userAnswers,
    		score,
    		showExplanation,
    		showHint,
    		showTimer,
    		timer,
    		showHighScores,
    		showShareButton,
    		questions,
    		highScores,
    		answerQuestion,
    		restartQuiz,
    		shareResults,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
