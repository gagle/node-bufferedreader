var BufferedReader = require ("../build/buffered-reader");

new BufferedReader ("file").skip (2, function (error, skipped){
	if (error) return console.log (error);
	
	//Skipped 0x00, 0x01
	//Prints 2
	console.log (skipped);
	
	this.readBytes (3, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		
		//Prints 0x22, 0x33, 0x44
		console.log (bytes);
		
		this.close (function (error){
			if (error) console.log (error);
		});
	});
});