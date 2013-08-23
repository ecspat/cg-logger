/********************************************************************************
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
/*global require process console __dirname exports module*/

var fs = require('fs'),
	path = require('path'),
	esprima = require('esprima'),
	estraverse = require('estraverse'),
	escodegen = require('escodegen');

// basename of the input file
var file_name;
// a stack to keep track of all function declarations seen in the current scope
var declarations = [];
// a counter to keep track of the usage of tmp variables
var tmp_var_count = 0;

//instrument

function instrument(ast) {
	estraverse.replace(ast, {
		enter: function(node, parent) {
			if (node.type === 'Program') {
				declarations.push([]);
			}
			if (node.type === 'FunctionDeclaration') {
				declarations[declarations.length - 1].push(node);
				declarations.push([]);
			}
			if (node.type === 'FunctionExpression') {
				declarations.push([]);
			}
			if (node.type === 'AssignmentExpression') {
				node.left.lhs = true;
			}
			if (node.type === 'UpdateExpression') {
				node.argument.lhs = true;
			}
			if (node.type === 'CallExpression') {
				node.callee.isCallee = true;
			}
		},
		leave: function(node, parent) {
			//wrap call expressions.
			var tmp_var_name, tmp_var_name_1;
			var tmps, exprs;
			var nd, p;

			if (node.type === 'CallExpression' || node.type === 'NewExpression') {
				if (node.callee.type === 'Identifier') {
					return seq_expr_node([log_call_node(pos_info(node), node.callee), node]);
				}
				if (node.callee.type === 'MemberExpression') {
					if (is_pure(node.callee.object)) {
						if (is_pure(node.callee.property)) {
							return seq_expr_node([log_call_node(pos_info(node), node.callee), node]);
						} else {
							tmp_var_name = get_a_tmp();
							return seq_expr_node([assign_node(tmp_var_name, node.callee.property),
								log_call_node(pos_info(node), {
									"type": "MemberExpression",
									"computed": true,
									"object": node.callee.object,
									"property": id_node(tmp_var_name)
								}),
								call_expr_node({
									"type": "MemberExpression",
									"computed": true,
									"object": node.callee.object,
									"property": id_node(tmp_var_name)
								}, node['arguments'])
							]);
						}
					} else {
						if (is_pure(node.callee.property)) {
							tmp_var_name = get_a_tmp();
							return seq_expr_node([assign_node(tmp_var_name, node.callee.object),
								log_call_node(pos_info(node), {
									"type": "MemberExpression",
									"computed": node.callee.computed,
									"object": id_node(tmp_var_name),
									"property": node.callee.property
								}),
								call_expr_node({
									"type": "MemberExpression",
									"computed": node.callee.computed,
									"object": id_node(tmp_var_name),
									"property": node.callee.property
								}, node['arguments'])
							]);
						} else {
							tmp_var_name = get_a_tmp();
							tmp_var_name_1 = get_a_tmp();
							return seq_expr_node([assign_node(tmp_var_name, node.callee.object),
								assign_node(tmp_var_name_1, node.callee.property),
								log_call_node(pos_info(node), {
									"type": "MemberExpression",
									"computed": true,
									"object": id_node(tmp_var_name),
									"property": id_node(tmp_var_name_1)
								}), call_expr_node({
									"type": "MemberExpression",
									"computed": true,
									"object": id_node(tmp_var_name),
									"property": id_node(tmp_var_name_1)
								}, node['arguments'])
							]);
						}
					}
				}
				tmp_var_name = get_a_tmp();
				return seq_expr_node([assign_node(tmp_var_name, node.callee),
					log_call_node(pos_info(node), id_node(tmp_var_name)),
					call_expr_node(tmp_var_name, node['arguments'])
				]);
			}

			if (node.type === 'FunctionExpression') {
				inject_wrappers(declarations.pop(), node.body.body);
				return call_expr_node('__wrapFn', [pos_info(node), node]);
			}
			if (node.type === 'FunctionDeclaration') {
				inject_wrappers(declarations.pop(), node.body.body);
			}
			if (node.type === 'Program') {
				inject_wrappers(declarations.pop(), node.body);
				inject_tmp_var_decls(node.body);
			}
			if (node.type === 'MemberExpression' && !node.lhs && !node.isCallee) {
				if (node.computed) {
					return call_expr_node('__pr', [ pos_info(node), node.object, node.property ]);
				} else {
					return call_expr_node('__pr', [ pos_info(node), node.object, literal_node(node.property.name) ]);
				}
			}
		}
	});
}

//ast node constructor

function literal_node(v) {
	return {
		type: "Literal",
		value: v
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

//helper functions

function is_pure(node) {
	switch (node.type) {
		case 'Literal':
		case 'Identifier':
		case 'ThisExpression':
			return true;
		default:
			return false;
	}
}

function clone(node) {
	if (node.type === 'Identifier') {
		return id_node(node.name);
	}
	if (node.type === 'Literal') {
		return literal_node(node.value);
	}
	if (node.type === 'ThisExpression') {
		return {
			type: "ThisExpression"
		};
	}
	if (node.type === 'ArrayExpression') {
		return array_node(node.elements);
	}
	if (node.type === 'MemberExpression') {
		return {
			type: "MemberExpression",
			computed: node.computed,
			object: clone(node.object),
			property: clone(node.property)
		};
	}
	throw new Error();
}

function log_call_node(pos, callee) {
	return call_expr_node("__log", [pos, callee]);
}

function pos_info(node) {
	return literal_node(file_name + "@" + node.loc.start.line + ":" + node.range[0] + "-" + node.range[1]);
}

function get_a_tmp() {
	var name = "__tmp" + tmp_var_count;
	tmp_var_count += 1;
	return name;
}

function inject_wrappers(fns, body) {
	fns.forEach(function(fn) {
		var node = expr_stmt_node(call_expr_node("__wrapFn", [pos_info(fn), fn.id]));
		body.unshift(node);
	});
}

function inject_tmp_var_decls(body) {
	if (tmp_var_count <= 0) return;
	var decls = [];
	for (var i = 0; i < tmp_var_count; i++) {
		decls.push({
			type: "VariableDeclarator",
			id: {
				type: "Identifier",
				name: "__tmp" + i
			},
			init: null
		});
	}
	body.unshift({
		type: "VariableDeclaration",
		declarations: decls,
		kind: "var"
	});
}

// external interface
exports.instrument_file = function(fn) {
	var ast = esprima.parse(fs.readFileSync(fn, 'utf-8'), {
		range: true,
		loc: true
	});
	file_name = path.basename(fn);
	instrument(ast);
	return escodegen.generate(ast);
};

if (require.main === module) {
	if (!process.argv[2]) {
		console.error('\033[31mfile path is required!');
		process.exit(-1);
	}

	console.log(exports.instrument_file(process.argv[2]));
}