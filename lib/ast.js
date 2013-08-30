/********************************************************************************
 * Copyright (c) 2013 Max Schaefer.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Gabriel Suen - initial API and implementation
 *     Max Schaefer - Contributor
 *******************************************************************************/
 
/*global require exports*/

var estraverse = require('estraverse');

/** Utility functions for creating and cloning AST nodes. */
function literal_node(v) {
	return {
		type: "Literal",
		value: v,
		raw: v
	};
}

function id_node(id_name) {
	return {
		type: "Identifier",
		name: id_name
	};
}

function array_node(arr) {
	//every element in arr should be an ast node
	return {
		type: "ArrayExpression",
		elements: arr
	};
}

function assign_node(lhs_name, rhs_node) {
	return {
		type: "AssignmentExpression",
		operator: "=",
		left: {
			type: "Identifier",
			name: lhs_name
		},
		right: rhs_node
	};
}

function call_expr_node(callee, args) {
	//args should be an array of ast nodes, rather than an array literal
	if (typeof callee === 'string') {
		callee = id_node(callee);
	}
	return {
		type: "CallExpression",
		callee: callee,
		'arguments': args
	};
}

function new_expr_node(callee, args) {
	//args should be an array of ast nodes, rather than an array literal
	if (typeof callee === 'string') {
		callee = id_node(callee);
	}
	return {
		type: "NewExpression",
		callee: callee,
		'arguments': args
	};
}

function memb_expr_node(computed, obj, prop) {
	return {
		type: "MemberExpression",
		computed: computed,
		object: obj,
		property: prop
	};
}

function seq_expr_node(exprs) {
	return {
		type: "SequenceExpression",
		expressions: exprs
	};
}

function expr_stmt_node(expr) {
	return {
		type: "ExpressionStatement",
		expression: expr
	};
}

function clone(node) {
	var cloned_node;

	// check whether this is an AST node
	if (node && node.type in estraverse.VisitorKeys) {
		cloned_node = {};

		// recursively clone all children
		for (var p in node) {
			cloned_node[p] = clone(node[p]);
		}
	} else if (node && Array.isArray(node)) {
		cloned_node = [];

		for (var i = 0, n = node.length; i < n; ++i) {
			cloned_node[i] = clone(node[i]);
		}
	} else {
		// non-AST nodes are not cloned
		cloned_node = node;
	}

	return cloned_node;
}

exports.literal_node = literal_node;
exports.id_node = id_node;
exports.array_node = array_node;
exports.assign_node = assign_node;
exports.call_expr_node = call_expr_node;
exports.new_expr_node = new_expr_node;
exports.memb_expr_node = memb_expr_node;
exports.seq_expr_node = seq_expr_node;
exports.expr_stmt_node = expr_stmt_node;
exports.clone = clone;