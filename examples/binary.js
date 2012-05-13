var BufferedReader = require ("../build/buffered-reader");

new BufferedReader ("lorem ipsum 2")
	.on ("error", function (error){
		console.log (error);
	})
	.on ("byte", function (b, byteOffset){
		console.log ("byte: " + b + ", offset: " + byteOffset);
	})
	.on ("buffer", function (buffer){
		console.log ("buffer: " + buffer);
	})
	.read ();