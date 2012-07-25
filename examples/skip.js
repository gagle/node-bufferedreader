var BufferedReader = require ("../build/buffered-reader");

var handleError = function (bufferedReader, error, cb){
	console.log (error);
	if (!bufferedReader) return cb ();
	
	bufferedReader.close (function (error){
		if (error) console.log (error);
		cb ();
	});
};

new BufferedReader ("file").skip (2, function (error, skipped){
	if (error) return handleError (null, error, function (){ /* Error correctly managed. */ });
	
	//Skipped 0x00, 0x11
	//Prints: 2
	console.log (skipped);
	
	this.readBytes (3, function (error, bytes, bytesRead){
		if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
		
		//Prints 0x22, 0x33, 0x44
		console.log (bytes);
		
		this.close (function (error){
			if (error) handleError (null, error, function (){ /* Error correctly managed. */ });
		});
	});
});