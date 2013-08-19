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


/*global require process console __dirname*/

var fs = require('fs');

var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

var declarations = [];

function instrument(ast) {
	estraverse.replace(ast, {
		enter: function(node, parent) {
			
			if (node.type === 'FunctionDeclaration') {
				declarations[declarations.length - 1].push(node);
				declarations.push([]);
			}

			if (node.type === 'Program') {
				declarations.push([]);
			}

		},
		leave: function(node, parent) {
			
			if (node.type === 'CallExpression') {
				
				//__mcall
				if (node.callee.type === "MemberExpression") {
					if (node.callee.computed === false) {
						return {
							type: "CallExpression",
							callee: {
								"type": "Identifier",
								"name": "__mcall"
							},
							'arguments': [getPosition(node), node.callee.object, constructStringLiteral(node.callee.property.name), constructArrayLiteral(node['arguments'])]
						};
					} else {
						return {
							type: "CallExpression",
							callee: {
								"type": "Identifier",
								"name": "__mcall"
							},
							'arguments': [getPosition(node), node.callee.object, node.callee.property, constructArrayLiteral(node['arguments'])]
						};
					}
				}
				
				//__call
				return {
					type: "CallExpression",
					callee: {
						"type": "Identifier",
						"name": "__call"
					},
					'arguments': [getPosition(node), node.callee, constructArrayLiteral(node['arguments'])]
				};
			}
			
			if (node.type === 'NewExpression') {
				var callee_name = escodegen.generate(node.callee);
				return {
					type: "CallExpression",
					callee: {
						"type": "Identifier",
						"name": "__new"
					},
					'arguments': [getPosition(node), node.callee, constructArrayLiteral(node['arguments'])]
				};
			}
			
			if (node.type === 'FunctionDeclaration') {
				var local_fns = declarations.pop();
				insertWrapFunctions(local_fns, node.body.body);
			}

			if (node.type === 'Program') {
				var global_fns = declarations.pop();
				insertWrapFunctions(global_fns, node.body);
			}
			
			if (node.type === 'FunctionExpression') {
				if(node.skip) {
					return estraverse.VisitorOption.Skip;
				}
				node.skip = true; //mark visited nodes
				return {
					type: "CallExpression",
					callee: {
						"type": "Identifier",
						"name": "__wrapFn"
					},
					'arguments': [getPosition(node), node]
				};
			}
		}
	});
}


//helper functions
function getPosition(node) {
	return constructArrayLiteral([{
		type: 'Literal',
		value: node.range[0]
	}, {
		type: 'Literal',
		value: node.range[1]
	}, {
		type: 'Literal',
		value: node.loc.start.line
	}, {
		type: 'Literal',
		value: node.loc.end.line
	}]);
}

function constructArrayLiteral(arr) {
	return {
		type: "ArrayExpression",
		elements: arr
	};
}

function constructStringLiteral(v) {
	var strnode = {
		type: "Literal",
		value: v,
		raw: "'" + v + "'" //not sure
	};
	return strnode;

}

function insertWrapFunctions(fns, body) {
	fns.forEach(function(fn) {
		body.unshift({
			type: "ExpressionStatement",
			expression: {
				type: "CallExpression",
				callee: {
					type: "Identifier",
					name: "__wrapFn"
				},
				'arguments': [
				getPosition(fn), {
					type: "Identifier",
					name: fn.id.name
				}]
			}
		});
	});
}

//main
var ast = esprima.parse(fs.readFileSync(process.argv[2], 'utf-8'), {
	range: true,
	loc: true
});

instrument(ast);

var code = escodegen.generate(ast);

console.log(fs.readFileSync(__dirname + '/runtime.js', 'utf-8'));
console.log(code);