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

/*global require exports module __dirname process*/

var fs = require('fs'),
    temp = require('temp'),
    Browser = require('zombie'),
    reporter = require('nodeunit').reporters['default'];
    
function runtest(test, input_file, expected_output_file, get_actual_output) {
	var htmlTmp = temp.openSync({ suffix: '.html' }),
	    jsTmp = temp.openSync({ suffix: '.js' });
			    
	fs.writeSync(jsTmp.fd, require('../lib/instrument').instrument_file(input_file));
	fs.writeSync(htmlTmp.fd,
				 "<html><head>\n" +
				 "<script src='" + __dirname + "/../lib/runtime.js'></script>\n" +
				 "</head><body></body>\n" +
				 "<script src='" + jsTmp.path + "'></script>\n" +
				 "</html>\n");

	test.expect(1);
	Browser.visit("file://" + htmlTmp.path, { silent: true }, function(e, browser, status) {
		if(browser.errors && browser.errors.length) {
			test.fail(browser.errors.join('\n'));
		} else {
			var actual_output = get_actual_output(browser.window).trim();
			var expected_output = fs.readFileSync(expected_output_file, 'utf-8').trim();
			// uncomment the following lines to get more readable diagnostics
			if(actual_output != expected_output) {
				console.log("actual:\n" + actual_output);
			}
			test.equal(actual_output, expected_output);
		}
		test.done();
	});
}

exports["cg-tests"] = {};
var CG_TESTS_DIR = __dirname + "/cg-tests";
fs.readdirSync(CG_TESTS_DIR).forEach(function(file) {
	if (/\.js$/.test(file)) {
		exports["cg-tests"][file] = function(test) {
			runtest(test, CG_TESTS_DIR + '/' + file, CG_TESTS_DIR + '/' + file + "on",
				    function(window) { return window.__dump_call_graph(); });
		};
	}
});

exports["prop-tests"] = {};
var PROP_TESTS_DIR = __dirname + "/prop-tests";
fs.readdirSync(PROP_TESTS_DIR).forEach(function(file) {
	if (/\.js$/.test(file)) {
		exports["prop-tests"][file] = function(test) {
			runtest(test, PROP_TESTS_DIR + '/' + file, PROP_TESTS_DIR + '/' + file + "on",
					function(window) { return window.__dump_props(); });
		};
	}
});

/* If any arguments are passed, interpret them as names of tests to run. Otherwise, run all tests. */
if(process.argv.length > 2) {
	var fixture = {};
	for(var i=2,n=process.argv.length;i<n;++i) {
		var tmp = process.argv[i].split("/"),
			suite = tmp[tmp.length-2],
			test = tmp[tmp.length-1];
		fixture[suite] = fixture[suite] || {};
		fixture[suite][test] = exports[suite][test];
	}
	reporter.run(fixture);
} else {
	reporter.run(exports);
}
