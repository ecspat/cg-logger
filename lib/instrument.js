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
var tmp_vars = [];
// a random generated string to prevent conflict in globle scope
var tmp_var_suffix = Math.random().toString(36).substring(7);
// a counter to keep track of the usage of tmp variables
var tmp_var_count = 0;

//instrument

function instrument(ast) {
	estraverse.replace(ast, {
		enter: function(node, parent) {
			if (node.type === 'Program') {
				declarations.push([]);
				tmp_vars.push([]);
			}
			if (node.type === 'FunctionDeclaration') {
				declarations[declarations.length - 1].push(node);
				declarations.push([]);
				tmp_vars.push([]);
			}
			if (node.type === 'FunctionExpression') {
				declarations.push([]);
				tmp_vars.push([]);
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
			if (node.type === 'ForInStatement') {
				node.left.lhs = true;
			}
		},
		leave: function(node, parent) {
			var tmp_var_name, another_tmp_var_name, callee_expr;
			var selector = call_expr_node;
			//we transform every call expression or new expression
			//to a sequence expression to log call graph and property
			if (node.type === 'CallExpression' || node.type === 'NewExpression') {
				if (node.type === 'NewExpression')
					selector = new_expr_node;

				//Member Expression
				if (node.callee.type === 'MemberExpression') {
					if (is_pure(node.callee.object)) {
						if (is_pure(node.callee.property)) {
							return seq_expr_node([log_call_node(pos_info(node), node.callee),
								log_property_read(pos_info(node.callee), node.callee),
								node
							]);
						} else {
							tmp_var_name = get_a_tmp();
							callee_expr = {
								"type": "MemberExpression",
								"computed": true,
								"object": node.callee.object,
								"property": id_node(tmp_var_name)
							};
							return seq_expr_node([assign_node(tmp_var_name, node.callee.property),
								log_call_node(pos_info(node), callee_expr),
								log_property_read(pos_info(node.callee), callee_expr),
								selector(callee_expr, node['arguments'])
							]);
						}
					} else {
						if (is_pure(node.callee.property)) {
							tmp_var_name = get_a_tmp();
							callee_expr = {
								"type": "MemberExpression",
								"computed": node.callee.computed,
								"object": id_node(tmp_var_name),
								"property": node.callee.property
							};
							return seq_expr_node([assign_node(tmp_var_name, node.callee.object),
								log_call_node(pos_info(node), callee_expr),
								log_property_read(pos_info(node.callee), callee_expr),
								selector(callee_expr, node['arguments'])
							]);
						} else {
							tmp_var_name = get_a_tmp();
							another_tmp_var_name = get_a_tmp();
							callee_expr = {
								"type": "MemberExpression",
								"computed": true,
								"object": id_node(tmp_var_name),
								"property": id_node(another_tmp_var_name)
							};
							return seq_expr_node([assign_node(tmp_var_name, node.callee.object),
								assign_node(another_tmp_var_name, node.callee.property),
								log_call_node(pos_info(node), callee_expr),
								log_property_read(pos_info(node.callee), callee_expr),
								selector(callee_expr, node['arguments'])
							]);
						}
					}
				}

				if (is_pure(node.callee)) {
					return seq_expr_node([log_call_node(pos_info(node), node.callee), node]);
				} else {
					tmp_var_name = get_a_tmp();
					return seq_expr_node([assign_node(tmp_var_name, node.callee),
						log_call_node(pos_info(node), id_node(tmp_var_name)),
						selector(tmp_var_name, node['arguments'])
					]);
				}
			}

			if (node.type === 'FunctionExpression') {
				inject_wrappers(declarations.pop(), node.body.body);
				inject_tmp_var_decls(tmp_vars.pop(), node.body.body);
				return call_expr_node('__wrapFn', [pos_info(node), node]);
			}
			if (node.type === 'FunctionDeclaration') {
				inject_wrappers(declarations.pop(), node.body.body);
				inject_tmp_var_decls(tmp_vars.pop(), node.body.body);
			}
			if (node.type === 'Program') {
				inject_wrappers(declarations.pop(), node.body);
				inject_tmp_var_decls(tmp_vars.pop(), node.body);
			}
			if (node.type === 'MemberExpression' && !node.lhs && !node.isCallee) {
				return log_property_read(pos_info(node), node);
			}
		}
	});
}

//ast node constructor

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
	// we use a cheesy trick: serialise the node as JSON, then parse it again
	// the only case where this doesn't work is with regexp literals
	if (node.type === 'Literal') {
		return literal_node(node.value);
	} else {
		return JSON.parse(JSON.stringify(node));
	}
}

function log_call_node(pos, callee) {
	return call_expr_node("__log", [pos, callee]);
}

function log_property_read(pos, node) {
	if (node.computed) {
		return call_expr_node('__pr', [pos, node.object, node.property]);
	} else {
		return call_expr_node('__pr', [pos, node.object, literal_node(node.property.name)]);
	}
}

function pos_info(node) {
	return literal_node(file_name + "@" + node.loc.start.line + ":" + node.range[0] + "-" + node.range[1]);
}

function inject_wrappers(fns, body) {
	fns.forEach(function(fn) {
		var node = expr_stmt_node(call_expr_node("__wrapFn", [pos_info(fn), fn.id]));
		body.unshift(node);
	});
}

function get_a_tmp() {
	var name = "__tmp" + tmp_var_count + "_" + tmp_var_suffix;
	tmp_vars[tmp_vars.length-1].push(name);
	tmp_var_count += 1;
	return name;
}

function inject_tmp_var_decls(tmp_vars, body) {
	if (tmp_vars.length <= 0) return;
	var decls = [];
	for (var i = 0; i < tmp_vars.length; i++) {
		decls.push({
			type: "VariableDeclarator",
			id: {
				type: "Identifier",
				name: tmp_vars[i]
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