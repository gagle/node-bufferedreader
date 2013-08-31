var reader = require ("../lib");
var BinaryReader = reader.BinaryReader;
var DataReader = reader.DataReader;

var close = function (binaryReader, error){
	if (error) console.log (error);
	
	binaryReader.close (function (error){
		if (error) console.log (error);
	});
};

var file = "lorem ipsum";
var offset;

new DataReader (file, { encoding: "utf8" })
		.on ("error", function (error){
			console.log (error);
		})
		.on ("line", function (line, nextByteOffset){
			if (line === "Phasellus ultrices ligula sed odio ultricies egestas."){
				offset = nextByteOffset;
				this.interrupt ();
			}
		})
		.on ("end", function (){
			new BinaryReader (file)
					.seek (offset, function (error){
						if (error) return close (this, error);
						
						this.read (9, function (error, bytes, bytesRead){
							if (error) return close (this, error);
							
							console.log (bytes.toString ()); //Prints: Curabitur
							
							close (this);
						});
					});
		})
		.read ();