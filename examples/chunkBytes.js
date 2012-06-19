var BufferedReader = require ("../build/buffered-reader");

var handleError = function (bufferedReader, error, cb){
	console.log (error);
	if (!bufferedReader) return cb ();
	
	bufferedReader.close (function (error){
		if (error) console.log (error);
		cb ();
	});
};

console.log ("File size: 16");

new BufferedReader ("file").readBytes (10, function (error, bytes, bytesRead){
	if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
	
	console.log (bytes);
	console.log ("Bytes read: " + bytesRead);
	
	this.readBytes (8, function (error, bytes, bytesRead){
		if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
	
		console.log (bytes);
		console.log ("Bytes read: " + bytesRead);
		
		this.readBytes (4, function (error, bytes, bytesRead){
			if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
		
			//No more bytes, reached the end of the file
			console.log (bytes);
			console.log ("Bytes read: " + bytesRead);
			
			this.close (function (error){
				if (error) handleError (null, error, function (){ /* Error correctly managed. */ });
			});
		});
	});
});