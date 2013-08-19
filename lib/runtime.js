/*******************************************************************************
 * Copyright (c) 2013 Max Schaefer.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Max Schaefer - initial API and implementation
 *******************************************************************************/

/*global console*/

/** Runtime support library for instrumented code. */

var __call, __mcall, __new, __wrapFn;

function __log_pos (pos) {
	return (pos[2] + ":"+ pos[0] + "-" + pos[1]);
}

function __log_lib_func () {
	return "lib function call";
}


(function(global) {
	__wrapFn = function(pos, fn) {
		fn.__pos = pos;
		return fn;
	};
	
	__mcall = function(caller_pos, object, methodExpression, args) {
		var callee = object[methodExpression];
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			console.log(__log_pos(caller_pos)+"->"+__log_pos(callee_pos));
		} else {
			console.log(__log_pos(caller_pos)+"->"+__log_lib_func());
		}
		return object[methodExpression].apply(object, args);
		
	};

	__call = function(caller_pos, callee, args) {
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			console.log(__log_pos(caller_pos)+"->"+__log_pos(callee_pos));
		} else {
			console.log(__log_pos(caller_pos)+"->"+__log_lib_func());
		}
		return callee.apply(global, args);
	};
	
	__new = function(caller_pos, callee, args) {
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			console.log(__log_pos(caller_pos)+"->"+__log_pos(callee_pos));
		} else {
			console.log(__log_pos(caller_pos)+"->"+__log_lib_func());
		}
		var code = "new callee(" + args.map(function(o, i) {
			return "args["+i+"]";
		}).join() + ")";
		return eval(code);
	};
})(this);

/** End of Runtime */
