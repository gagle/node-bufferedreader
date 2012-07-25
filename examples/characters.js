var BufferedReader = require ("../build/buffered-reader");

/**
Two ways to read one character at a time:
- Using the "buffer" event with a buffer size of 1. Don't do this, it's very inefficient, it's just
  to give an example of a buffer event and size. Default size is 16KB.
- Using the "character" event.
*/

console.log ("\"buffer\" event: ");

new BufferedReader ("lorem ipsum 2", { encoding: "utf8", bufferSize: 1 })
	.on ("error", function (error){
		console.log (error);
	})
	.on ("buffer", function (buffer){
		console.log ("buffer: " + buffer);
	})
	.on ("end", function (){
		console.log ("\n\"character\" event: ");
		
		new BufferedReader ("lorem ipsum 2", { encoding: "utf8" })
			.on ("error", function (error){
				console.log (error);
			})
			.on ("character", function (character){
				console.log ("character: " + character);
			})
			.read ();
	})
	.read ();