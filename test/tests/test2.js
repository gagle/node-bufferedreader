var BufferedReader = require ("../../build/buffered-reader");

new BufferedReader ("file", { bufferSize: 5 }).readBytes (4, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	console.log (bytes);
	console.log ("bytes read: " + bytesRead);
	
	this.readBytes (3, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		
		this.readBytes (2, function (error, bytes, bytesRead){
			if (error) return console.log (error);
			console.log (bytes);
			console.log ("bytes read: " + bytesRead);
			
			this.readBytes (1, function (error, bytes, bytesRead){
				if (error) return console.log (error);
				console.log (bytes);
				console.log ("bytes read: " + bytesRead);
				
				this.readBytes (4, function (error, bytes, bytesRead){
					if (error) return console.log (error);
					console.log (bytes);
					console.log ("bytes read: " + bytesRead);
					
					this.readBytes (3, function (error, bytes, bytesRead){
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
	});
});