var BufferedReader = require ("../build/buffered-reader");

console.log ("File size: 16");

new BufferedReader ("file").readBytes (10, function (error, bytes, bytesRead){
	if (error) return console.log (error);
	
	console.log (bytes); //Prints: 0x00 0x11 0x22 0x33 0x44 0x55 0x66 0x77 0x88 0x99
	console.log ("Bytes read: " + bytesRead); //Prints: 10
	
	this.readBytes (8, function (error, bytes, bytesRead){
		if (error) return console.log (error);
	
		console.log (bytes); //Prints: 0xaa 0xbb 0xcc 0xdd 0xee 0xff
		console.log ("Bytes read: " + bytesRead); //Prints: 6
		
		this.readBytes (4, function (error, bytes, bytesRead){
			if (error) return console.log (error);
		
			//No more bytes, reached the end of the file
			console.log (bytes); //Prints: null
			console.log ("Bytes read: " + bytesRead); //Prints: 0
			
			this.close (function (error){
				if (error) console.log (error);
			});
		});
	});
});