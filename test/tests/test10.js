var BufferedReader = require ("../../build/buffered-reader");

var settings = { bufferSize: 4, start: 2, end: 9 };
new BufferedReader ("file2", settings).readBytes (5, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	console.log (bytes ? bytes.toString() : bytes);
	console.log ("Bytes read: " + bytesRead);
	
	this.seek (7, function (error){
		if (error) return console.log (error);
		
		this.readBytes (2, function (error, bytes, bytesRead){
			if (error) return console.log (error);
			console.log (bytes ? bytes.toString() : bytes);
			console.log ("Bytes read: " + bytesRead);
			
			this.seek (0, function (error){
				if (error) return console.log (error);
				
				this.readBytes (2, function (error, bytes, bytesRead){
					if (error) return console.log (error);
					console.log (bytes ? bytes.toString() : bytes);
					console.log ("Bytes read: " + bytesRead);
					
					this.close (function (error){
						if (error) console.log (error);
					});
				});
			});
		});
	});
});