var BufferedReader = require ("../build/buffered-reader");

new BufferedReader ("file", { start: 3, end: 6 })
	.seek (1, function (error){
	if (error) return console.log (error);
	
	//The cursor points to 0x44 (start 3 + seek 1 = 4, from 0)
	this.readBytes (10, function (error, bytes, bytesRead){
		if (error) return console.log (error);
		
		console.log (bytes); //Prints: 0x44 0x55 0x66 (end 6, from 0)
		console.log ("bytes read: " + bytesRead); //Prints: 3
		
		this.close (function (error){
			if (error) console.log (error);
		});
	});
});