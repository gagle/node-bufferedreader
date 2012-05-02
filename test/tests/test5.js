var BufferedReader = require ("../../build/buffered-reader");

new BufferedReader ("file", { bufferSize: 5 }).readBytes (5, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	console.log (bytes);
	console.log ("bytes read: " + bytesRead);
	
	this.readBytes (5, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		
		this.close (function (error){
			if (error) console.log (error);
		});
	});
});