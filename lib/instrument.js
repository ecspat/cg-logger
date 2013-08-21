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
/*global require process console __dirname*/

var fs = require('fs');

var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

if (!process.argv[2]) {
	console.error('\033[31mfile path is required!');
	process.exit();
}

//preparations
var file_name = function() {
		var components = process.argv[2].split('/');
		return components[components.length - 1];
	}();

var declarations = [];

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
		},
		leave: function(node, parent) {
			//wrap call expressions.
			if (node.type === 'CallExpression') {
				//mcall
				if (node.callee.type === 'MemberExpression') {
					if (node.callee.computed === false) {
						return call_expr_node('__mcall', [
						pos_info(node),
						node.callee.object,
						literal_node(node.callee.property.name),
						array_node(node['arguments'])]);
					} else {
						return call_expr_node('__mcall', [
						pos_info(node),
						node.callee.object,
						node.callee.property,
						array_node(node['arguments'])]);
					}
				}

				if (node.callee.type === 'Identifier') {
					return call_expr_node('__call', [
					pos_info(node),
					node.callee,
					array_node(node['arguments'])]);
				}
			}
			if (node.type === 'FunctionExpression') {
				inject_wrappers(declarations.pop(), node.body.body);
				return call_expr_node('__wrapFn', [
				pos_info(node),
				node]);
			}
			if (node.type == 'NewExpression') {
				return call_expr_node('__new', [
				pos_info(node),
				node.callee,
				array_node(node['arguments'])]);
			}
			if (node.type === 'FunctionDeclaration') {
				inject_wrappers(declarations.pop(), node.body.body);
			}
			if (node.type === 'Program') {
				inject_wrappers(declarations.pop(), node.body);
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

function call_expr_node(callee_name, args) {
	//args should be an array of ast nodes, rather than an array literal
	return {
		type: "CallExpression",
		callee: {
			type: "Identifier",
			name: callee_name
		},
		'arguments': args
	};
}

function expr_stmt_node(expr) {
	return {
		type: "ExpressionStatement",
		expression: expr
	};
}

//helper functions

function pos_info(node) {
	return array_node([
	literal_node(file_name),
	literal_node(node.range[0]),
	literal_node(node.range[1]),
	literal_node(node.loc.start.line),
	literal_node(node.loc.end.line)]);
}


function inject_wrappers(fns, body) {
	fns.forEach(function(fn) {
		var node = expr_stmt_node(call_expr_node("__wrapFn", [pos_info(fn), fn.id]));
		body.unshift(node);
	});
}

function inject_dump_fn(body) {
	body.push(expr_stmt_node(call_expr_node("__dump_call_graph", [])));
}

//instrument on the raw js program
var ast = esprima.parse(fs.readFileSync(process.argv[2], 'utf-8'), {
	range: true,
	loc: true
});
instrument(ast);
var code = escodegen.generate(ast);
//console.log(fs.readFileSync(__dirname + '/runtime.js', 'utf-8'));
console.log(code);