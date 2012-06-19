var BufferedReader = require ("../build/buffered-reader");

var handleError = function (error){
	console.log (error);
};

new BufferedReader ("lorem ipsum", { encoding: "utf8" })
	.on ("error", function (error){
		handleError (error);
	})
	.on ("line", function (line){
		console.log ("line: " + line);
		if (line === "Phasellus pulvinar mauris in purus consequat vel congue orci hendrerit."){
			this.interrupt ();
		}
	})
	.on ("end", function (){
		console.log ("EOF");
	})
	.read ();