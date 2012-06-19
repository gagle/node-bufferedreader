var BufferedReader = require ("../build/buffered-reader");

var handleError = function (bufferedReader, error, cb){
	console.log (error);
	if (!bufferedReader) return cb ();
	
	bufferedReader.close (function (error){
		if (error) console.log (error);
		cb ();
	});
};

new BufferedReader ("file", { start: 3, end: 6 }).seek (1, function (error){
	if (error) return handleError (null, error, function (){ /* Error correctly managed. */ });
	
	this.readBytes (10, function (error, bytes, bytesRead){
		if (error) return handleError (this, error, function (){ /* Error correctly managed. */ });
		
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		
		this.close (function (error){
			if (error) handleError (null, error, function (){ /* Error correctly managed. */ });
		});
	});
});