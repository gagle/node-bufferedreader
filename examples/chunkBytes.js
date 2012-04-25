var BufferedReader = require ("../build/buffered-reader");

console.log ("File size: 16");

new BufferedReader ("file").readBytes (10, function (error, bytes, bytesRead){
	if (error) console.log (error);
	
	console.log (bytes);
	console.log ("Bytes read: " + bytesRead);
	
	this.readBytes (8, function (error, bytes, bytesRead){
		if (error) console.log (error);
	
		console.log (bytes);
		console.log ("Bytes read: " + bytesRead);
		
		this.readBytes (4, function (error, bytes, bytesRead){
			if (error) console.log (error);
		
			//No more bytes, reached the end of the file
			console.log (bytes);
			console.log ("Bytes read: " + bytesRead);
			
			this.close (function (error){
				if (error) console.log (error);
			});
		});
	});
});