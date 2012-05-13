var BufferedReader = require ("../build/buffered-reader");

new BufferedReader ("lorem ipsum", { encoding: "utf8" })
	.on ("error", function (error){
		console.log (error);
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