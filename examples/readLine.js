var BufferedReader = require ("../build/buffered-reader").BufferedReader;

new BufferedReader ("lorem ipsum", "utf8")
	.on ("error", function (error){
		console.log ("error: " + error);
	})
	.on ("line", function (line){
		console.log ("line: " + line);
	})
	.read ();