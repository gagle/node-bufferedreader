var DataReader = require ("../../build/buffered-reader").DataReader;

var file = "data_reader_file";
var encoding = "utf8";

new DataReader (file, { encoding: encoding, bufferSize: 5 })
		//This event is emitted on error, the file is closed automatically
		.on ("error", function (error){
			console.log (error);
		})
		//This event is only emitted when the encoding is unspecified
		.on ("byte", function (b, byteOffset){
			console.log ("byte:\t\t" + b);
		})
		//This event is only emitted when the encoding is specified
		.on ("character", function (c, byteOffset){
			console.log ("character:\t" + c);
			
		})
		//This event is only emitted when the encoding is specified
		.on ("line", function (line, byteOffset){
			console.log ("line:\t\t" + line);
			if (line === "Lorem"){
				this.pause ();
				var me = this;
				setTimeout (function (){
					me.resume ();
				}, 3000);
			}
		})
		//This event is emitted always
		.on ("buffer", function (buffer, byteOffset){
			console.log (encoding ? "buffer:\t\t" + buffer : buffer);
		})
		//This event is emitted always
		.on ("end", function (){
			console.log ("END");
		})
		.read ();