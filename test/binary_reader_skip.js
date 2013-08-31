var BinaryReader = require ("../lib").BinaryReader;

var file = "binary_reader_file";

var close = function (binaryReader, error){
	if (error) console.log (error);
	
	binaryReader.close (function (error){
		if (error) console.log (error);
	});
};

var window = {
	start: 10,
	end: 13
};

var br = new BinaryReader (file, { start: window.start, end: window.end });

console.log ("window: [" + window.start + ", " + window.end + "]");
console.log ("offset: " + br.getOffset ());

br.skip (2, function (error, skipped){
	if (error) return close (this, error);
	
	console.log ("skipped (2): " + skipped);
	console.log ("offset: " + this.getOffset ());
	
	this.skip (3, function (error, skipped){
		if (error) return close (this, error);
		
		console.log ("skipped (3): " + skipped);
		console.log ("offset: " + br.getOffset ());
		
		this.skip (5, function (error, skipped){
			if (error) return close (this, error);
			
			console.log ("skipped (5): " + skipped);
			console.log ("offset: " + br.getOffset ());
			
			this.skip (-10, function (error, skipped){
				if (error) return close (this, error);
				
				console.log ("skipped (-10): " + skipped);
				console.log ("offset: " + br.getOffset ());
				
				this.skip (-1, function (error, skipped){
					if (error) return close (this, error);
					
					console.log ("skipped (-1): " + skipped);
					console.log ("offset: " + br.getOffset ());
					
					close (this);
				});
			});
		});
	});
});