var BufferedReader = require ("../../build/buffered-reader");

new BufferedReader ("file", { bufferSize: 5 }).readBytes (7, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	console.log (bytes);
	console.log ("bytes read: " + bytesRead);
	
	this.readBytes (6, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		
		this.readBytes (8, function (error, bytes, bytesRead){
			if (error) return console.log (error);
			console.log (bytes);
			console.log ("bytes read: " + bytesRead);
			
			this.readBytes (8, function (error, bytes, bytesRead){
				if (error) return console.log (error);
				console.log (bytes);
				console.log ("bytes read: " + bytesRead);
				
				this.close (function (error){
					if (error) console.log (error);
				});
			});
		});
	});
});