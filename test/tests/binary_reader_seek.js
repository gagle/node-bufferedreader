var BinaryReader = require ("../../build/buffered-reader").BinaryReader;

var file = "binary_reader_file";

var close = function (binaryReader, error){
	if (error) console.log (error);
	
	binaryReader.close (function (error){
		if (error) console.log (error);
	});
};

var window = {
	start: 2,
	end: 10
};

var br = new BinaryReader (file, { start: window.start, end: window.end });

console.log ("window: [" + window.start + ", " + window.end + "]");
console.log ("offset: " + br.getOffset ());

br.seek (2, function (error){
	if (error) return close (this, error);
	
	console.log ("seek (2): window.start + 2 = " + (window.start + 2));
	console.log ("offset: " + this.getOffset ());
	
	this.seek (10, function (error){
		console.log ("seek (10): window.start + 10 = " + (window.start + 10));
		console.log ("Error: " + error.description);
		console.log ("offset: " + br.getOffset ());
		
		this.seek (BinaryReader.START_OF_WINDOW, function (error){
			if (error) return close (this, error);
			
			console.log ("seek (START_OF_WINDOW): window.start = " + window.start);
			console.log ("offset: " + br.getOffset ());
			
			this.seek (BinaryReader.END_OF_WINDOW, function (error){
				if (error) return close (this, error);
				
				console.log ("seek (END_OF_WINDOW): window.end = " + window.end);
				console.log ("offset: " + br.getOffset ());
				
				close (this);
			});
		});
	});
});