cg-logger
=========

Dynamic analysis for logging call graphs and object properties

Installation
------------

Run `npm install` in this directory to pull in dependencies.


Usage
-----

        node lib/instrument.js foo.js

This instruments file `foo.js` to track function calls and property reads. Do this for every JavaScript file in the web application you want to analyse.

Now create a copy of any HTML pages you want to analyse, and have the copy include the instrumented scripts instead of the original ones. (If there are some scripts you do not want to instrument, it is fine to include them as-is along with instrumented code.) Also, load `lib/runtime.js` through a `script` tag in the very beginning of the HTML page.

Then open the page in a browser and exercise the application. After you have exercised it enough, invoke `__dump_call_graph()` to dump a JSON representation of the dynamic call graph, and `__dump_props()` to dump a JSON representation of all the properties observed to be available at all property reads.

In the browser console, you can use the `copy` function to copy the result of `__dump_call_graph()` and `__dump_props()` to the clipboard, which makes it easier to store them as local files.
