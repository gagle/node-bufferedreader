"use strict";

var Runner = require ("mocha-runner");

new Runner ({
	exclude: ["binary-reader", "data-reader"],
	tests: ["binary-reader/binary-reader.js", "data-reader/data-reader.js"]
}).run (function (error){
	if (error) console.log (error);
});