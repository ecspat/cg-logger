/*******************************************************************************
 * Copyright (c) 2013 Max Schaefer.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Max Schaefer - initial API and implementation
 *     Gabriel Suen - Contributor
 *******************************************************************************/

/*global console require*/

/** Runtime support library for instrumented code. */

var __call, __mcall, __new, __wrapFn, __dump_call_graph;

(function(global) {
	var call_graph = {};
	
	//TODO: lib functions should be wrapped here
	(function () {
		return;
	})();

	//helpers
	var __pos_repr = function(pos) {
			if (pos.length > 1)
				return (pos[0] + "@" + pos[3] + ":" + pos[1] + "-" + pos[2]); //for local functions
			else 
				return pos[0]; //for lib functions
		};

	var __log = function(caller_pos, callee_pos) {
			var key = __pos_repr(caller_pos);
			if (!call_graph[key]) {
				call_graph[key] = [];
			}
			
			if (call_graph[key].indexOf(__pos_repr(callee_pos)) < 0) {
				call_graph[key].push(__pos_repr(callee_pos));
			}
		};

	//instrument functions
	__wrapFn = function(pos, fn) {
		fn.__pos = pos;
		return fn;
	};
	
	__mcall = function(caller_pos, object, methodExpression, args) {
		var callee = object[methodExpression];
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			__log(caller_pos, callee_pos);
			
		}
		return object[methodExpression].apply(object, args);

	};

	__call = function(caller_pos, callee, args) {
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			__log(caller_pos, callee_pos);
		}
		return callee.apply(global, args);
	};

	__new = function(caller_pos, callee, args) {
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			__log(caller_pos, callee_pos);
		}
		var code = "new callee(" + args.map(function(o, i) {
			return "args[" + i + "]";
		}).join() + ")";
		return eval(code);
	};
	
	__dump_call_graph = function() {
		return JSON.stringify(call_graph);
	};
})(this);

/** End of runtime */