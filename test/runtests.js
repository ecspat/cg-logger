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

/*global require exports module __dirname*/

var fs = require('fs'),
    temp = require('temp'),
    Browser = require('zombie');
    
function runtest(test, input_file, expected_output_file) {
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
			var actual_output = browser.window.__dump_call_graph().trim();
			var expected_output = fs.readFileSync(expected_output_file, 'utf-8').trim();
			test.equal(actual_output, expected_output);
		}
		test.done();
	});
}

var DIR = __dirname + "/unit-tests";
fs.readdirSync(DIR).forEach(function(file) {
	if (/\.js$/.test(file)) {
		exports[file] = function(test) {
			runtest(test, DIR + '/' + file, DIR + '/' + file + "on");
		};
	}
});

var reporter = require('nodeunit').reporters['default'];
reporter.run({
	"unit tests": module.exports
});