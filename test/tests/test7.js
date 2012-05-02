var BufferedReader = require ("../../build/buffered-reader");

var settings = { bufferSize: 4, start: 2, end: 7 };
new BufferedReader ("file2", settings).readBytes (4, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	console.log (bytes ? bytes.toString() : bytes);
	console.log ("Bytes read: " + bytesRead);
	
	this.readBytes (4, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		console.log (bytes ? bytes.toString() : bytes);
		console.log ("Bytes read: " + bytesRead);
		
		this.close (function (error){
			if (error) console.log (error);
		});
	})
});