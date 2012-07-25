var BufferedReader = require ("../build/buffered-reader");

var offset;

new BufferedReader ("lorem ipsum", { encoding: "utf8" })
	.on ("error", function (error){
		console.log (error);
	})
	.on ("line", function (line, byteOffset){
		if (line === "Phasellus ultrices ligula sed odio ultricies egestas."){
			offset = byteOffset;
			this.interrupt ();
		}
	})
	.on ("end", function (){
		this.seek (offset, function (error){
			if (error) return console.log (error);
			
			this.readBytes (9, function (error, bytes, bytesRead){
				if (error) return console.log (error);
				
				console.log (bytes.toString ()); //Prints: Curabitur
				
				this.close (function (error){
					if (error) console.log (error);
				});
			});
		})
	})
	.read ();