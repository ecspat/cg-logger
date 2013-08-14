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

/**
 * Simple instrumenter that inserts instrumentation code for logging calls and property reads.
 */

var esprima = require('esprima'),
    escodegen = require('escodegen'),
    fs = require('fs');
    
/** Generate expression representing the position of an AST node; currently only captures the start offset. */
function getPos(nd) {
	return {
		type: 'Literal',
		value: nd.range[0]
	};
}

/** Generate code to tag a given list of functions with their positions; adds the code to the list of statements provided as second argument. */
function wrapFunctions(fns, body) {
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
				getPos(fn), {
					type: "Identifier",
					name: fn.id.name
				}]
			}
		});
	});
}

/** Stack used by the visitor to keep track of function declarations seen in the current scope. */    
var declarations = [];

/** Visitor that performs the actual instrumentation.*/
function instrument(nd) {
	switch (nd.type) {
	case 'CallExpression':
		// TODO: check whether nd.callee is a MemberExpression; in that case, need to use __mcall
		instrument(nd.callee);
		nd['arguments'].forEach(instrument);
		nd['arguments'] = [
		getPos(nd),
		nd.callee, {
			type: 'ArrayExpression',
			elements: nd['arguments']
		}];
		nd.callee = {
			type: 'Identifier',
			name: '__call'
		};
		break;
	case 'ExpressionStatement':
		instrument(nd.expression);
		break;
	case 'FunctionDeclaration':
		declarations[declarations.length-1].push(nd);
		var local_fns = [];
		declarations.push(local_fns);
		instrument(nd.body);
		declarations.pop();
		wrapFunctions(local_fns, nd.body.body);
		break;
	case 'FunctionExpression':
		// TODO: function(){} -> __wrapFn(getPos(nd), function(){})
	case 'NewExpression':
		// TODO: new A() -> __new(<pos>, A, [])
	case 'Identifier':
	case 'Literal':
	case 'DebuggerStatement':
		break;
	case 'BlockStatement':
	case 'Program':
		var global_fns = [];
		declarations.push(global_fns);
		nd.body.forEach(instrument);
		declarations.pop();
		wrapFunctions(global_fns, nd.body);
		break;
	default:
		throw new Error("Cannot handle " + nd.type);
	}
}
    
// command line interface: instrument file passed as first argument, output it together with the runtime support library
var ast = esprima.parse(fs.readFileSync(process.argv[2], 'utf-8'), { range: true });
instrument(ast);
console.log(fs.readFileSync(__dirname + '/runtime.js', 'utf-8'));
console.log(escodegen.generate(ast));