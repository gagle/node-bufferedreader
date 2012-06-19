var BufferedReader = require ("../build/buffered-reader");

var handleError = function (bufferedReader, error, cb){
	console.log (error);
	if (!bufferedReader) return cb ();
	
	bufferedReader.close (function (error){
		if (error) console.log (error);
		cb ();
	});
};

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
			if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
			
			this.readBytes (9, function (error, bytes, bytesRead){
				if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
				
				console.log (bytes.toString ());
				
				this.close (function (error){
					if (error) handleError (null, error, function (){ /* Error correctly managed. */ });
				});
			});
		})
	})
	.read ();