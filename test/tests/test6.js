var BufferedReader = require ("../../build/buffered-reader");

new BufferedReader ("file2", { bufferSize: 3 }).readBytes (4, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	console.log (bytes ? bytes.toString () : bytes);
	console.log ("Bytes read: " + bytesRead);
	
	this.readBytes (1, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		console.log (bytes ? bytes.toString () : bytes);
		console.log ("Bytes read: " + bytesRead);
		
		this.close (function (error){
			if (error) console.log (error);
		});
	})
});