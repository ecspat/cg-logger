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

var __call, __wrapFn;

(function(global) {
	__wrapFn = function(pos, fn) {
		fn.__pos = pos;
		return fn;
	};
	
	__call = function(caller_pos, callee, args) {
		if(callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			console.log(caller_pos + " -> " + callee_pos);
		}
		return callee.apply(global, args);
	};
})(this);